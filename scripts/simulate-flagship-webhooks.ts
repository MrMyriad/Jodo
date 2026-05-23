import crypto from "crypto";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { encryptConnectionCredentials } from "@/lib/connection-service";
import { toPrismaJson } from "@/lib/prisma-json";
import { isQueueConfigured } from "@/lib/queue/config";
import { getDeadLetterQueue, getWorkflowQueue } from "@/lib/queue/workflow-queue";

type WorkflowSeed = {
  name: string;
  trigger: Record<string, unknown>;
  steps: Array<Record<string, unknown>>;
  expectedStatus?: "SUCCESS" | "FAILED";
};

const prisma = new PrismaClient();
loadEnvConfig(process.cwd());
const localPort = process.env.PORT || "3000";
const baseUrl = (
  process.env.BASE_URL ||
  process.env.BASE ||
  `http://localhost:${localPort}`
).replace(/\/+$/, "");
const testEmail =
  process.env.FLAGSHIP_TEST_EMAIL || "qa+flagship@jodo.local";
const simulationTag = "flagship-live-sim";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

async function upsertIntegration(input: {
  userId: string;
  type:
    | "RAZORPAY"
    | "WHATSAPP_BUSINESS"
    | "INSTAGRAM"
    | "ZOHO_BOOKS"
    | "GOOGLE_SHEETS"
    | "EXOTEL";
  name: string;
  credentials: Record<string, unknown>;
}) {
  let credentialsForStorage: Record<string, unknown>;
  try {
    credentialsForStorage = encryptConnectionCredentials(input.credentials);
  } catch {
    // Fallback for local simulation when encryption key is not configured.
    credentialsForStorage = input.credentials;
  }

  const existing = await prisma.integration.findFirst({
    where: {
      userId: input.userId,
      type: input.type,
      name: input.name,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        credentials: toPrismaJson(credentialsForStorage),
      },
    });
    return existing.id;
  }

  const created = await prisma.integration.create({
    data: {
      userId: input.userId,
      type: input.type,
      name: input.name,
      isActive: true,
      credentials: toPrismaJson(credentialsForStorage),
    },
    select: { id: true },
  });
  return created.id;
}

function flagshipWorkflows(queueEnabled: boolean): WorkflowSeed[] {
  const seeds: WorkflowSeed[] = [
    {
      name: "SIM Razorpay -> Invoice -> WhatsApp",
      trigger: {
        type: "razorpay.payment_captured",
        config: { event: "payment.captured" },
      },
      steps: [
        {
          type: "zoho_create_invoice",
          config: {
            customerName: "{{customer.name}}",
            items: [{ name: "Order", quantity: 1, rate: "{{amount}}" }],
          },
        },
        {
          type: "whatsapp_send",
          config: {
            sendTo: "trigger",
            message:
              "Hi {{customer.name}}, payment Rs {{amount}} received. Invoice: {{step0.invoiceUrl}}",
            attachInvoicePdfFromStep: 0,
            documentFilename: "invoice.pdf",
          },
        },
      ],
      expectedStatus: "SUCCESS",
    },
    {
      name: "SIM Instagram DM -> WhatsApp -> Confirmation -> Sheet",
      trigger: {
        type: "instagram.dm_received",
      },
      steps: [
        {
          type: "instagram_reply",
          config: {
            message:
              "Thanks for DM. We are sharing the catalog on WhatsApp now.",
          },
        },
        {
          type: "whatsapp_send",
          config: {
            sendTo: "trigger",
            message: "Catalog link: https://example.com/catalog",
            onMissingPhone: "skip",
          },
        },
        {
          type: "instagram_reply",
          config: {
            message:
              "Confirmation: if WhatsApp is not received, share your number again.",
          },
        },
        {
          type: "sheets_append",
          config: {
            sheetName: "Leads",
            columns: ["{{customer.phone}}", "{{text}}", "{{source}}"],
          },
        },
      ],
      expectedStatus: "SUCCESS",
    },
    {
      name: "SIM Missed Call -> WhatsApp",
      trigger: {
        type: "exotel.missed_call",
      },
      steps: [
        {
          type: "whatsapp_send",
          config: {
            sendTo: "trigger",
            message: "Hi, sorry we missed your call. Here is our catalog.",
          },
        },
      ],
      expectedStatus: "SUCCESS",
    },
  ];

  if (queueEnabled) {
    seeds.push({
      name: "SIM Retry Probe -> Dead Letter",
      trigger: {
        type: "exotel.missed_call",
      },
      steps: [
        {
          type: "unknown_action",
          config: {},
        },
      ],
      expectedStatus: "FAILED",
    });
  }

  return seeds;
}

async function createWorkflow(userId: string, seed: WorkflowSeed) {
  const created = await prisma.workflow.create({
    data: {
      userId,
      name: seed.name,
      description: `${simulationTag}:${nowIso()}`,
      isActive: true,
      trigger: toPrismaJson(seed.trigger),
      steps: seed.steps.map((step) => toPrismaJson(step)),
    },
    select: { id: true, name: true },
  });

  return created;
}

async function findLatestExecution(workflowId: string, since: Date) {
  return prisma.execution.findFirst({
    where: {
      workflowId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      error: true,
      stepResults: true,
      createdAt: true,
      completedAt: true,
    },
  });
}

async function waitForExecution(
  workflowId: string,
  since: Date,
  timeoutMs = 120000,
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const execution = await findLatestExecution(workflowId, since);
    if (
      execution &&
      (execution.status === "SUCCESS" || execution.status === "FAILED")
    ) {
      return execution;
    }
    await sleep(1200);
  }

  throw new Error(`Timed out waiting for workflow ${workflowId} execution.`);
}

async function postJson(
  url: string,
  payload: Record<string, unknown>,
  headers?: Record<string, string>,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  return { status: response.status, body: json };
}

async function cleanup(workflowIds: string[]) {
  await prisma.execution.deleteMany({
    where: {
      workflowId: { in: workflowIds },
    },
  });

  await prisma.workflow.deleteMany({
    where: {
      id: { in: workflowIds },
    },
  });
}

async function clearQueueStateIfConfigured() {
  if (!isQueueConfigured()) {
    return;
  }

  const workflowQueue = getWorkflowQueue();
  const deadLetterQueue = getDeadLetterQueue();

  await workflowQueue.pause();
  await workflowQueue.drain(true);
  await workflowQueue.clean(0, 10000, "completed");
  await workflowQueue.clean(0, 10000, "failed");
  await workflowQueue.clean(0, 10000, "delayed");
  await workflowQueue.resume();

  await deadLetterQueue.pause();
  await deadLetterQueue.drain(true);
  await deadLetterQueue.clean(0, 10000, "completed");
  await deadLetterQueue.clean(0, 10000, "failed");
  await deadLetterQueue.clean(0, 10000, "delayed");
  await deadLetterQueue.resume();
}

async function waitForDeadLetterJob(
  executionId: string,
  timeoutMs = 120000,
) {
  if (!isQueueConfigured()) {
    return false;
  }

  const deadLetterQueue = getDeadLetterQueue();
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const jobs = await deadLetterQueue.getJobs(
      ["waiting", "active", "completed", "failed", "delayed"],
      0,
      200,
      false,
    );

    const matched = jobs.some(
      (job) =>
        job.data &&
        typeof job.data === "object" &&
        (job.data as Record<string, unknown>).executionId === executionId,
    );

    if (matched) {
      return true;
    }

    await sleep(1500);
  }

  return false;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  if (
    process.env.JODO_MOCK_INTEGRATIONS !== "1" &&
    process.env.AUTOMATEDESI_MOCK_INTEGRATIONS !== "1"
  ) {
    throw new Error(
      "Set JODO_MOCK_INTEGRATIONS=1 before running this simulation script.",
    );
  }

  console.log("[sim] Starting flagship webhook simulation...");
  console.log(`[sim] Base URL: ${baseUrl}`);
  console.log(
    `[sim] Queue mode: ${isQueueConfigured() ? "enabled (BullMQ)" : "disabled (inline fallback)"}`,
  );

  await clearQueueStateIfConfigured();

  const user = await prisma.user.upsert({
    where: { email: testEmail },
    update: {},
    create: {
      email: testEmail,
      name: "Flagship Simulation User",
      language: "en",
      plan: "PRO",
    },
    select: { id: true, email: true },
  });
  console.log(`[sim] Using user: ${user.email} (${user.id})`);

  const razorpayWebhookSecret = "flagship_sim_razorpay_secret";
  const exotelWebhookSecret = "flagship_sim_exotel_secret";

  await Promise.all([
    upsertIntegration({
      userId: user.id,
      type: "RAZORPAY",
      name: "SIM Razorpay",
      credentials: {
        keyId: "rzp_test_sim_key",
        keySecret: "rzp_test_sim_secret",
        webhookSecret: razorpayWebhookSecret,
      },
    }),
    upsertIntegration({
      userId: user.id,
      type: "WHATSAPP_BUSINESS",
      name: "SIM WhatsApp",
      credentials: {
        phoneNumberId: "sim_phone_id",
        accessToken: "sim_access_token",
        businessAccountId: "sim_business_id",
      },
    }),
    upsertIntegration({
      userId: user.id,
      type: "ZOHO_BOOKS",
      name: "SIM Zoho",
      credentials: {
        accessToken: "sim_zoho_access",
        organizationId: "sim_org_001",
        apiDomain: "https://www.zohoapis.in",
      },
    }),
    upsertIntegration({
      userId: user.id,
      type: "INSTAGRAM",
      name: "SIM Instagram",
      credentials: {
        accessToken: "sim_ig_access",
        igAccountId: "sim_ig_account",
      },
    }),
    upsertIntegration({
      userId: user.id,
      type: "GOOGLE_SHEETS",
      name: "SIM Sheets",
      credentials: {
        accessToken: "sim_sheets_access",
        spreadsheetId: "sim_sheet_id",
        sheetName: "Leads",
      },
    }),
    upsertIntegration({
      userId: user.id,
      type: "EXOTEL",
      name: "SIM Exotel",
      credentials: {
        apiKey: "sim_exotel_key",
        apiToken: "sim_exotel_token",
        webhookSecret: exotelWebhookSecret,
      },
    }),
  ]);

  const queueEnabled = isQueueConfigured();

  const seeds = flagshipWorkflows(queueEnabled);
  const seeded = await Promise.all(
    seeds.map((seed) => createWorkflow(user.id, seed)),
  );
  const workflowIds = seeded.map((item) => item.id);
  const since = new Date();
  console.log(`[sim] Created workflows: ${workflowIds.join(", ")}`);

  try {
    const razorpayPayload = {
      event: "payment.captured",
      account_id: "acc_sim_001",
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: "pay_sim_001",
            amount: 149900,
            email: "buyer@example.com",
            contact: "919876543210",
            method: "upi",
          },
        },
      },
    };
    const razorpayBody = JSON.stringify(razorpayPayload);
    const razorpaySignature = crypto
      .createHmac("sha256", razorpayWebhookSecret)
      .update(razorpayBody)
      .digest("hex");

    const razorpayResponse = await fetch(`${baseUrl}/api/webhooks/razorpay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": razorpaySignature,
      },
      body: razorpayBody,
    });
    console.log(`[sim] Razorpay webhook status: ${razorpayResponse.status}`);

    const instagramResponse = await postJson(
      `${baseUrl}/api/webhooks/instagram`,
      {
        object: "instagram",
        entry: [
          {
            messaging: [
              {
                sender: { id: "ig_user_123" },
                recipient: { id: "ig_business_123" },
                timestamp: Date.now(),
                message: {
                  mid: "mid.sim.001",
                  text: "Hi, send details on 9876543210",
                },
              },
            ],
          },
        ],
      },
    );
    console.log(`[sim] Instagram webhook status: ${instagramResponse.status}`);

    const exotelResponse = await postJson(
      `${baseUrl}/api/webhooks/exotel?secret=${encodeURIComponent(exotelWebhookSecret)}`,
      {
        From: "919912345678",
        CallStatus: "missed",
      },
    );
    console.log(`[sim] Exotel webhook status: ${exotelResponse.status}`);

    const executionByWorkflow = new Map<
      string,
      Awaited<ReturnType<typeof waitForExecution>>
    >();
    for (const workflow of seeded) {
      const execution = await waitForExecution(workflow.id, since, 180000);
      executionByWorkflow.set(workflow.id, execution);
    }

    console.log("[sim] Execution results:");
    for (const [index, workflow] of seeded.entries()) {
      const expectedStatus = seeds[index]?.expectedStatus ?? "SUCCESS";
      const execution = executionByWorkflow.get(workflow.id);
      if (!execution) continue;
      const stepResults = Array.isArray(execution.stepResults)
        ? execution.stepResults
        : [];
      console.log(
        `  - ${workflow.name}: ${execution.status} (expected=${expectedStatus}, steps=${stepResults.length})`,
      );
      if (execution.status !== "SUCCESS") {
        console.log(`    error: ${execution.error ?? "unknown"}`);
      }
    }

    const mismatches = seeded.filter((workflow, index) => {
      const expectedStatus = seeds[index]?.expectedStatus ?? "SUCCESS";
      const execution = executionByWorkflow.get(workflow.id);
      if (!execution) return true;
      return execution.status !== expectedStatus;
    });

    if (mismatches.length > 0) {
      throw new Error(
        `${mismatches.length} workflow execution(s) did not match expected status. See logs above.`,
      );
    }

    if (queueEnabled) {
      const failingIndex = seeds.findIndex(
        (seed) => seed.expectedStatus === "FAILED",
      );
      if (failingIndex >= 0) {
        const failingWorkflow = seeded[failingIndex];
        const failingExecution = executionByWorkflow.get(failingWorkflow.id);
        if (!failingExecution) {
          throw new Error("Missing execution for retry/dead-letter probe workflow.");
        }

        const deadLetterRecorded = await waitForDeadLetterJob(
          failingExecution.id,
          180000,
        );

        if (!deadLetterRecorded) {
          throw new Error(
            "Retry/dead-letter probe failed: execution did not appear in dead-letter queue.",
          );
        }

        console.log(
          `[sim] Retry/dead-letter probe PASS: execution ${failingExecution.id} reached dead-letter queue.`,
        );
      }
    } else {
      console.log(
        "[sim] Queue verification skipped: configure REDIS_URL or UPSTASH_REDIS_URL to validate retries and dead-letter queue.",
      );
    }

    console.log("[sim] PASS: all flagship workflows executed successfully.");
  } finally {
    await cleanup(workflowIds);
    console.log("[sim] Cleanup complete (workflows + executions removed).");
  }
}

main()
  .catch((error) => {
    console.error("[sim] FAIL:", error instanceof Error ? error.stack : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
