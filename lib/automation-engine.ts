import { IntegrationType, Prisma } from "@prisma/client";
import { decryptConnectionCredentials } from "@/lib/connection-service";
import { appendToSheet } from "@/lib/integrations/google-sheets";
import { sendWhatsAppMessage } from "@/lib/integrations/whatsapp";
import { prisma } from "@/lib/prisma";
import { toPrismaJson } from "@/lib/prisma-json";
import { isQueueConfigured } from "@/lib/queue/config";
import {
  enqueueWorkflowExecutionJob,
  type WorkflowExecutionJobData,
} from "@/lib/queue/workflow-queue";

type TriggerPayload = Record<string, unknown>;

type WorkflowAction = {
  type: string;
  config?: Record<string, unknown>;
};

type EngineActionResult = {
  type: string;
  result: unknown;
  timestamp: string;
};

type ConnectionCredentials = Record<string, unknown>;

type RazorpayTriggerConfig = {
  event?: string;
};

type TriggerDefinition = {
  type?: string;
  config?: RazorpayTriggerConfig & Record<string, unknown>;
};

type WorkflowRecord = {
  id: string;
  userId: string;
  trigger: Prisma.JsonValue;
  steps: Prisma.JsonValue[];
  isActive: boolean;
};

type ProcessAttemptContext = {
  attemptNumber: number;
  maxAttempts: number;
  source: string;
  jobId?: string;
};

type EnqueueWorkflowOptions = {
  source?: string;
  existingWorkflow?: WorkflowRecord;
};

export type EnqueueWorkflowResult = {
  accepted: boolean;
  queued: boolean;
  executionId?: string;
  reason?: string;
};

function parseSteps(stepsJson: Prisma.JsonValue[]): WorkflowAction[] {
  if (!Array.isArray(stepsJson)) return [];

  const parsed: WorkflowAction[] = [];

  for (const item of stepsJson) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const actionRecord = item as Record<string, unknown>;
    if (typeof actionRecord.type !== "string") {
      continue;
    }

    const config =
      actionRecord.config &&
      typeof actionRecord.config === "object" &&
      !Array.isArray(actionRecord.config)
        ? (actionRecord.config as Record<string, unknown>)
        : undefined;

    parsed.push({
      type: actionRecord.type,
      config,
    });
  }

  return parsed;
}

function parseTrigger(triggerJson: Prisma.JsonValue): TriggerDefinition {
  if (
    !triggerJson ||
    typeof triggerJson !== "object" ||
    Array.isArray(triggerJson)
  ) {
    return {};
  }

  return triggerJson as TriggerDefinition;
}

function resolvePathValue(data: unknown, path: string): unknown {
  const keys = path.trim().split(".");
  let current: unknown = data;

  for (const key of keys) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function replaceVariables(template: string, data: TriggerPayload): string {
  return template.replace(/{{(.*?)}}/g, (_match, rawPath) => {
    const value = resolvePathValue(data, rawPath as string);
    return value === undefined || value === null ? "" : String(value);
  });
}

function replaceVariablesWithStepResults(
  template: string,
  triggerData: TriggerPayload,
  stepResults: Array<Record<string, unknown>>,
): string {
  return template.replace(/{{(.*?)}}/g, (_match, rawPath) => {
    const path = String(rawPath ?? "").trim();
    if (path.startsWith("step")) {
      const m = /^step(\d+)\.(.+)$/.exec(path);
      if (m) {
        const idx = Number(m[1]);
        const rest = m[2];
        const value = resolvePathValue(stepResults[idx], rest);
        return value === undefined || value === null ? "" : String(value);
      }
    }

    const value = resolvePathValue(triggerData, path);
    return value === undefined || value === null ? "" : String(value);
  });
}

async function getConnection(userId: string, type: IntegrationType) {
  const connection = await prisma.integration.findFirst({
    where: {
      userId,
      type,
      isActive: true,
    },
  });

  if (!connection) {
    return null;
  }

  return connection;
}

function parseConnectionCredentials(
  credentialsJson: Prisma.JsonValue | null | undefined,
): ConnectionCredentials {
  return decryptConnectionCredentials(credentialsJson);
}

function inferPhoneFromTrigger(triggerData: TriggerPayload): string | null {
  const explicitPhone = resolvePathValue(triggerData, "customer.phone");
  if (typeof explicitPhone === "string" && explicitPhone.trim()) {
    return explicitPhone.trim();
  }

  const paymentContact = resolvePathValue(triggerData, "payment.contact");
  if (typeof paymentContact === "string" && paymentContact.trim()) {
    return paymentContact.trim();
  }

  const from = resolvePathValue(triggerData, "from");
  if (typeof from === "string" && from.trim()) {
    return from.trim();
  }

  return null;
}

function parseColumns(columns: unknown, triggerData: TriggerPayload): string[] {
  if (Array.isArray(columns)) {
    return columns.map((column) => {
      if (typeof column === "string") {
        return replaceVariables(column, triggerData);
      }

      if (column && typeof column === "object") {
        const value = (column as Record<string, unknown>).value;
        if (typeof value === "string") {
          return replaceVariables(value, triggerData);
        }
      }

      return "";
    });
  }

  if (typeof columns === "string") {
    return columns
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => replaceVariables(part, triggerData));
  }

  return [];
}

function inferCustomerNameFromTrigger(triggerData: TriggerPayload): string {
  const direct = resolvePathValue(triggerData, "customer.name");
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return "Customer";
}

function inferCustomerEmailFromTrigger(
  triggerData: TriggerPayload,
): string | null {
  const direct = resolvePathValue(triggerData, "customer.email");
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const paymentEmail = resolvePathValue(triggerData, "payment.email");
  if (typeof paymentEmail === "string" && paymentEmail.trim())
    return paymentEmail.trim();
  return null;
}

async function executeAction(
  userId: string,
  action: WorkflowAction,
  triggerData: TriggerPayload,
): Promise<unknown> {
  const config = action.config ?? {};

  switch (action.type) {
    case "instagram_reply": {
      const connection = await getConnection(userId, "INSTAGRAM");
      if (!connection) {
        throw new Error(
          "Instagram integration is missing. Connect Instagram before running this step.",
        );
      }

      const credentials = parseConnectionCredentials(connection.credentials);
      const accessToken = credentials.accessToken as string | undefined;
      const igAccountId = credentials.igAccountId as string | undefined;
      if (!accessToken || !igAccountId) {
        throw new Error(
          "Instagram credentials require accessToken and igAccountId.",
        );
      }

      const { replyToInstagramMessage } =
        await import("@/lib/integrations/instagram");

      const recipientId =
        (config.recipientId && typeof config.recipientId === "string"
          ? replaceVariables(config.recipientId, triggerData)
          : null) ??
        (resolvePathValue(triggerData, "senderId") as string | undefined);

      if (!recipientId) {
        throw new Error("Could not resolve Instagram recipientId.");
      }

      const textTemplate =
        (config.message as string | undefined) ??
        "Thanks! We will get back to you shortly.";
      const stepResultsRaw =
        (config.__stepResults as Array<Record<string, unknown>> | undefined) ??
        [];
      const text = replaceVariablesWithStepResults(
        textTemplate,
        triggerData,
        stepResultsRaw,
      );

      return replyToInstagramMessage({
        credentials: { accessToken, igAccountId },
        recipientId,
        message: text,
      });
    }

    case "zoho_create_invoice": {
      const connection = await getConnection(userId, "ZOHO_BOOKS");
      if (!connection) {
        throw new Error(
          "Zoho Books integration is missing. Connect Zoho Books before running this step.",
        );
      }

      const credentials = parseConnectionCredentials(connection.credentials);
      const accessToken = credentials.accessToken as string | undefined;
      const organizationId = credentials.organizationId as string | undefined;

      if (!accessToken || !organizationId) {
        throw new Error(
          "Zoho Books credentials require accessToken and organizationId.",
        );
      }

      const { createZohoInvoice } =
        await import("@/lib/integrations/zoho-books");

      const itemsRaw = config.items;
      const items = Array.isArray(itemsRaw)
        ? itemsRaw
            .map((item) => {
              if (!item || typeof item !== "object" || Array.isArray(item))
                return null;
              const rec = item as Record<string, unknown>;
              const name =
                typeof rec.name === "string"
                  ? replaceVariables(rec.name, triggerData)
                  : "Item";
              const quantity =
                typeof rec.quantity === "number"
                  ? rec.quantity
                  : Number(rec.quantity ?? 1);
              const rate =
                typeof rec.rate === "number" ? rec.rate : Number(rec.rate ?? 0);
              return {
                name,
                quantity: Number.isFinite(quantity) ? quantity : 1,
                rate: Number.isFinite(rate) ? rate : 0,
              };
            })
            .filter(
              (
                value,
              ): value is { name: string; quantity: number; rate: number } =>
                value !== null,
            )
        : [
            {
              name: "Order",
              quantity: 1,
              rate: Number(resolvePathValue(triggerData, "amount") ?? 0),
            },
          ];

      const response = await createZohoInvoice({
        credentials: { accessToken, organizationId },
        customerName:
          (config.customerName && typeof config.customerName === "string"
            ? replaceVariables(config.customerName, triggerData)
            : null) ?? inferCustomerNameFromTrigger(triggerData),
        customerEmail: inferCustomerEmailFromTrigger(triggerData),
        items,
      });

      return {
        invoiceId: response.invoice?.invoice_id ?? null,
        invoiceNumber: response.invoice?.invoice_number ?? null,
        invoiceUrl: response.invoice?.invoice_url ?? null,
        status: response.invoice?.status ?? null,
      };
    }

    case "whatsapp_send": {
      const connection = await getConnection(userId, "WHATSAPP_BUSINESS");
      const credentials = parseConnectionCredentials(connection?.credentials);
      const phoneNumberId =
        (credentials.phoneNumberId as string | undefined) ??
        process.env.WHATSAPP_PHONE_NUMBER_ID;
      const accessToken =
        (credentials.accessToken as string | undefined) ??
        process.env.WHATSAPP_ACCESS_TOKEN;

      if (!phoneNumberId || !accessToken) {
        throw new Error(
          "WhatsApp connection is missing. Add credentials in Connections first.",
        );
      }

      const sendTo = (config.sendTo as string | undefined) ?? "trigger";
      const to =
        sendTo === "custom"
          ? (config.customPhone as string | undefined)
          : inferPhoneFromTrigger(triggerData);

      if (!to) {
        const onMissingPhone = config.onMissingPhone as string | undefined;
        if (onMissingPhone === "skip") {
          return { skipped: true, reason: "missing_phone" };
        }
        throw new Error(
          "Could not resolve recipient phone number for WhatsApp action.",
        );
      }

      const messageTemplate =
        (config.message as string | undefined) ?? "Automation alert";
      const stepResultsRaw =
        (config.__stepResults as Array<Record<string, unknown>> | undefined) ??
        [];
      const message = replaceVariablesWithStepResults(
        messageTemplate,
        triggerData,
        stepResultsRaw,
      );
      const result = await sendWhatsAppMessage(
        { phoneNumberId, accessToken },
        to,
        message,
      );

      return result;
    }

    case "sheets_append": {
      const connection = await getConnection(userId, "GOOGLE_SHEETS");
      if (!connection) {
        throw new Error(
          "Google Sheets connection is missing. Connect Sheets before running this action.",
        );
      }

      const credentials = parseConnectionCredentials(connection.credentials);
      const accessToken = credentials.accessToken as string | undefined;
      const spreadsheetId =
        (config.spreadsheetId as string | undefined) ??
        (credentials.spreadsheetId as string | undefined);
      const sheetName =
        (config.sheetName as string | undefined) ??
        (credentials.sheetName as string | undefined) ??
        "Sheet1";

      if (!accessToken || !spreadsheetId) {
        throw new Error(
          "Google Sheets credentials require accessToken and spreadsheetId.",
        );
      }

      const values = parseColumns(config.columns, triggerData);
      if (values.length === 0) {
        throw new Error(
          "Google Sheets action needs at least one mapped column.",
        );
      }

      const result = await appendToSheet(
        {
          accessToken,
          spreadsheetId,
          sheetName,
        },
        [values],
      );

      return result;
    }

    case "gmail_send":
      return {
        skipped: true,
        reason:
          "Gmail action execution is planned in the next integration slice.",
      };

    case "delay": {
      const secondsRaw = config.seconds;
      const seconds =
        typeof secondsRaw === "number" ? secondsRaw : Number(secondsRaw ?? 0);
      const boundedSeconds = Math.max(0, Math.min(300, seconds));

      await new Promise((resolve) => {
        setTimeout(resolve, boundedSeconds * 1000);
      });

      return { delayed: boundedSeconds };
    }

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

function triggerMatchesWorkflow(
  workflowTrigger: TriggerDefinition,
  triggerData: TriggerPayload,
): boolean {
  const expectedEvent = workflowTrigger.config?.event;
  if (!expectedEvent) {
    return true;
  }

  const incomingEvent = triggerData.event;
  if (typeof incomingEvent !== "string") {
    return false;
  }

  return incomingEvent === expectedEvent;
}

async function getWorkflowRecord(
  workflowId: string,
): Promise<WorkflowRecord | null> {
  return prisma.workflow.findUnique({
    where: { id: workflowId },
    select: {
      id: true,
      userId: true,
      isActive: true,
      trigger: true,
      steps: true,
    },
  });
}

async function createExecutionRecord(
  workflow: WorkflowRecord,
  triggerData: TriggerPayload,
) {
  return prisma.execution.create({
    data: {
      workflowId: workflow.id,
      userId: workflow.userId,
      status: "RUNNING",
      triggerData: toPrismaJson(triggerData),
      stepResults: [] as Prisma.InputJsonValue[],
      tasksConsumed: 0,
    },
    select: {
      id: true,
    },
  });
}

async function markExecutionSuccess(
  workflow: WorkflowRecord,
  executionId: string,
  actionResults: EngineActionResult[],
) {
  const completedAt = new Date();
  const tasksConsumed = actionResults.length;
  const stepResults = actionResults.map(
    (result) => toPrismaJson(result) as Prisma.InputJsonValue,
  );

  await prisma.$transaction([
    prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "SUCCESS",
        stepResults,
        completedAt,
        error: null,
        tasksConsumed,
      },
    }),
    prisma.user.update({
      where: { id: workflow.userId },
      data: {
        tasksUsedThisMonth: { increment: tasksConsumed },
      },
    }),
  ]);
}

async function markExecutionFailure(
  executionId: string,
  actionResults: EngineActionResult[],
  message: string,
  finalFailure: boolean,
) {
  const completedAt = finalFailure ? new Date() : null;
  const stepResults = actionResults.map(
    (result) => toPrismaJson(result) as Prisma.InputJsonValue,
  );

  await prisma.execution.update({
    where: { id: executionId },
    data: {
      status: finalFailure ? "FAILED" : "RETRYING",
      error: message,
      stepResults,
      completedAt,
    },
  });
}

export async function processWorkflowExecutionJob(
  jobData: WorkflowExecutionJobData,
  context: ProcessAttemptContext,
): Promise<void> {
  const workflow = await getWorkflowRecord(jobData.workflowId);
  if (!workflow) {
    await markExecutionFailure(
      jobData.executionId,
      [],
      "Workflow no longer exists.",
      true,
    );
    return;
  }

  if (!workflow.isActive) {
    await markExecutionFailure(
      jobData.executionId,
      [],
      "Workflow is not active.",
      true,
    );
    return;
  }

  const workflowTrigger = parseTrigger(workflow.trigger);
  if (!triggerMatchesWorkflow(workflowTrigger, jobData.triggerData)) {
    await markExecutionFailure(
      jobData.executionId,
      [],
      "Trigger payload no longer matches workflow trigger conditions.",
      true,
    );
    return;
  }

  const actions = parseSteps(workflow.steps);
  if (actions.length === 0) {
    await markExecutionFailure(
      jobData.executionId,
      [],
      "Workflow has no steps configured.",
      true,
    );
    return;
  }

  const actionResults: EngineActionResult[] = [];

  try {
    for (const action of actions) {
      const configWithStepResults = {
        ...(action.config ?? {}),
        __stepResults: actionResults.map((r) =>
          r &&
          typeof r.result === "object" &&
          r.result !== null &&
          !Array.isArray(r.result)
            ? (r.result as Record<string, unknown>)
            : { value: r.result },
        ),
      };
      const result = await executeAction(
        workflow.userId,
        { ...action, config: configWithStepResults },
        jobData.triggerData,
      );
      actionResults.push({
        type: action.type,
        result,
        timestamp: new Date().toISOString(),
      });
    }

    await markExecutionSuccess(workflow, jobData.executionId, actionResults);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown workflow execution error";
    const finalFailure = context.attemptNumber >= context.maxAttempts;
    const failureMessage = finalFailure
      ? message
      : `Attempt ${context.attemptNumber}/${context.maxAttempts} failed: ${message}`;

    await markExecutionFailure(
      jobData.executionId,
      actionResults,
      failureMessage,
      finalFailure,
    );

    throw new Error(message);
  }
}

async function enqueueWorkflowFromRecord(
  workflow: WorkflowRecord,
  triggerData: TriggerPayload,
  source: string,
): Promise<EnqueueWorkflowResult> {
  const workflowTrigger = parseTrigger(workflow.trigger);
  if (!triggerMatchesWorkflow(workflowTrigger, triggerData)) {
    return {
      accepted: false,
      queued: false,
      reason: "trigger_mismatch",
    };
  }

  const execution = await createExecutionRecord(workflow, triggerData);

  if (isQueueConfigured()) {
    try {
      await enqueueWorkflowExecutionJob({
        workflowId: workflow.id,
        executionId: execution.id,
        triggerData,
        source,
        queuedAt: new Date().toISOString(),
      });

      return {
        accepted: true,
        queued: true,
        executionId: execution.id,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to enqueue workflow job.";
      await prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: "FAILED",
          error: `Queue enqueue failed: ${message}`,
          completedAt: new Date(),
        },
      });

      return {
        accepted: false,
        queued: false,
        executionId: execution.id,
        reason: "enqueue_failed",
      };
    }
  }

  try {
    await processWorkflowExecutionJob(
      {
        workflowId: workflow.id,
        executionId: execution.id,
        triggerData,
        source: `${source}:inline`,
        queuedAt: new Date().toISOString(),
      },
      {
        attemptNumber: 1,
        maxAttempts: 1,
        source: `${source}:inline`,
      },
    );
  } catch {
    // The execution row already contains the failure details.
  }

  return {
    accepted: true,
    queued: false,
    executionId: execution.id,
  };
}

export async function enqueueWorkflowExecution(
  workflowId: string,
  triggerData: TriggerPayload,
  options?: EnqueueWorkflowOptions,
): Promise<EnqueueWorkflowResult> {
  const workflow =
    options?.existingWorkflow ?? (await getWorkflowRecord(workflowId));
  if (!workflow || !workflow.isActive) {
    return {
      accepted: false,
      queued: false,
      reason: "workflow_unavailable",
    };
  }

  return enqueueWorkflowFromRecord(
    workflow,
    triggerData,
    options?.source ?? "manual",
  );
}

export async function executeWorkflowsForTriggerTypes(
  triggerTypes: string[],
  triggerData: TriggerPayload,
  options?: {
    userIds?: string[];
    source?: string;
  },
): Promise<{
  matched: number;
  failedToStart: number;
  queued: number;
  inlineExecuted: number;
}> {
  if (triggerTypes.length === 0) {
    return {
      matched: 0,
      failedToStart: 0,
      queued: 0,
      inlineExecuted: 0,
    };
  }

  const workflows = await prisma.workflow.findMany({
    where: {
      isActive: true,
      ...(options?.userIds && options.userIds.length > 0
        ? {
            userId: {
              in: options.userIds,
            },
          }
        : {}),
      OR: triggerTypes.map((triggerType) => ({
        trigger: {
          path: ["type"],
          equals: triggerType,
        },
      })),
    },
    select: {
      id: true,
      userId: true,
      isActive: true,
      trigger: true,
      steps: true,
    },
  });

  let failedToStart = 0;
  let queued = 0;
  let inlineExecuted = 0;

  for (const workflow of workflows) {
    const result = await enqueueWorkflowFromRecord(
      workflow,
      triggerData,
      options?.source ?? "trigger_router",
    );

    if (!result.accepted && result.reason === "enqueue_failed") {
      failedToStart += 1;
      continue;
    }

    if (result.accepted && result.queued) {
      queued += 1;
    } else if (result.accepted) {
      inlineExecuted += 1;
    }
  }

  return {
    matched: workflows.length,
    failedToStart,
    queued,
    inlineExecuted,
  };
}
