import { loadEnvConfig } from "@next/env";
import { Job, Worker } from "bullmq";
import { GstAuditAction, GstDocumentStatus } from "@prisma/client";
import { processWorkflowExecutionJob } from "@/lib/automation-engine";
import { createGstAuditLog } from "@/lib/gst/audit";
import { processGstExtractionJob } from "@/lib/gst/extraction-worker";
import {
  getGstExtractionQueueName,
  getQueueAttempts,
  getQueueConcurrency,
  getWorkerHeartbeatKey,
  getWorkflowQueueName,
  isQueueConfigured,
} from "@/lib/queue/config";
import {
  closeQueueRedisConnection,
  getQueueRedisConnection,
} from "@/lib/queue/redis";
import {
  enqueueWorkflowDeadLetterJob,
  type WorkflowExecutionJobData,
} from "@/lib/queue/workflow-queue";
import { prisma } from "@/lib/prisma";
import type { GstExtractionJobData } from "@/lib/gst/extraction-queue";

loadEnvConfig(process.cwd());

function resolveMaxAttempts(job: Job<unknown>): number {
  if (typeof job.opts.attempts === "number" && job.opts.attempts > 0) {
    return job.opts.attempts;
  }

  return getQueueAttempts();
}

const queueName = getWorkflowQueueName();
const gstQueueName = getGstExtractionQueueName();
const heartbeatKey = getWorkerHeartbeatKey();

if (!isQueueConfigured()) {
  console.warn(
    "[workflow-worker] Queue is not configured. Set REDIS_URL or UPSTASH_REDIS_URL to enable async processing.",
  );
  process.exit(0);
}

const queueConnection = getQueueRedisConnection();

async function writeWorkerHeartbeat() {
  await queueConnection.set(
    heartbeatKey,
    JSON.stringify({
      queueName,
      gstQueueName,
      pid: process.pid,
      timestamp: new Date().toISOString(),
    }),
    "EX",
    45,
  );
}

const heartbeatTimer = setInterval(() => {
  void writeWorkerHeartbeat().catch((error) => {
    console.error("[workflow-worker] heartbeat failed:", error);
  });
}, 15_000);

const worker = new Worker<WorkflowExecutionJobData>(
  queueName,
  async (job) => {
    const attemptNumber = job.attemptsMade + 1;
    const maxAttempts = resolveMaxAttempts(job);

    await processWorkflowExecutionJob(job.data, {
      attemptNumber,
      maxAttempts,
      source: "workflow-worker",
      jobId: job.id?.toString(),
    });
  },
  {
    connection: queueConnection,
    concurrency: getQueueConcurrency(),
  },
);

const gstWorker = new Worker<GstExtractionJobData>(
  gstQueueName,
  async (job) => {
    await processGstExtractionJob(job.data);
  },
  {
    connection: queueConnection,
    concurrency: Math.max(1, Math.min(3, getQueueConcurrency())),
  },
);

worker.on("ready", () => {
  console.log(`[workflow-worker] listening on queue "${queueName}"`);
  void writeWorkerHeartbeat().catch((error) => {
    console.error("[workflow-worker] initial heartbeat failed:", error);
  });
});

gstWorker.on("ready", () => {
  console.log(`[workflow-worker] listening on queue "${gstQueueName}"`);
  void writeWorkerHeartbeat().catch((error) => {
    console.error("[workflow-worker] GST heartbeat failed:", error);
  });
});

worker.on("completed", (job) => {
  console.log(
    `[workflow-worker] completed job ${job.id} execution=${job.data.executionId}`,
  );
});

gstWorker.on("completed", (job) => {
  console.log(
    `[workflow-worker] completed GST extraction job ${job.id} document=${job.data.documentId}`,
  );
});

worker.on("failed", async (job, error) => {
  if (!job) {
    console.error("[workflow-worker] job failed without payload:", error);
    return;
  }

  const maxAttempts = resolveMaxAttempts(job);
  const finalFailure = job.attemptsMade >= maxAttempts;

  console.error(
    `[workflow-worker] failed job ${job.id} execution=${job.data.executionId} ` +
      `attempt=${job.attemptsMade}/${maxAttempts}: ${error.message}`,
  );

  if (!finalFailure) {
    return;
  }

  try {
    await enqueueWorkflowDeadLetterJob({
      originalJobId: job.id?.toString() ?? `${job.data.executionId}:unknown`,
      workflowId: job.data.workflowId,
      executionId: job.data.executionId,
      triggerData: job.data.triggerData,
      attempts: maxAttempts,
      failedAt: new Date().toISOString(),
      failureReason: error.message,
    });

    console.error(
      `[workflow-worker] dead-lettered execution=${job.data.executionId} after ${maxAttempts} attempts`,
    );
  } catch (deadLetterError) {
    console.error(
      `[workflow-worker] failed to dead-letter execution=${job.data.executionId}:`,
      deadLetterError,
    );
  }
});

gstWorker.on("failed", async (job, error) => {
  if (!job) {
    console.error("[workflow-worker] GST job failed without payload:", error);
    return;
  }

  const maxAttempts = resolveMaxAttempts(job);
  const finalFailure = job.attemptsMade >= maxAttempts;

  console.error(
    `[workflow-worker] failed GST job ${job.id} document=${job.data.documentId} ` +
      `attempt=${job.attemptsMade}/${maxAttempts}: ${error.message}`,
  );

  if (!finalFailure) {
    return;
  }

  try {
    await prisma.gstDocument.updateMany({
      where: { id: job.data.documentId, userId: job.data.userId },
      data: { status: GstDocumentStatus.FAILED, error: error.message },
    });
    await createGstAuditLog({
      userId: job.data.userId,
      clientId: job.data.clientId,
      periodId: job.data.periodId,
      action: GstAuditAction.EXTRACTION_FAILED,
      entityType: "GstDocument",
      entityId: job.data.documentId,
      message: `GST extraction failed after ${maxAttempts} attempts: ${error.message}`,
    });
  } catch (updateError) {
    console.error("[workflow-worker] failed to mark GST document failed:", updateError);
  }
});

let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(
    `[workflow-worker] received ${signal}, shutting down gracefully...`,
  );

  try {
    clearInterval(heartbeatTimer);
    await worker.close();
    await gstWorker.close();
    await closeQueueRedisConnection();
    console.log("[workflow-worker] shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("[workflow-worker] shutdown error:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
