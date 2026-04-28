import { Job, Worker } from "bullmq";
import { processWorkflowExecutionJob } from "@/lib/automation-engine";
import {
  getQueueAttempts,
  getQueueConcurrency,
  getWorkflowQueueName,
} from "@/lib/queue/config";
import {
  closeQueueRedisConnection,
  getQueueRedisConnection,
} from "@/lib/queue/redis";
import {
  enqueueWorkflowDeadLetterJob,
  type WorkflowExecutionJobData,
} from "@/lib/queue/workflow-queue";

function resolveMaxAttempts(job: Job<WorkflowExecutionJobData>): number {
  if (typeof job.opts.attempts === "number" && job.opts.attempts > 0) {
    return job.opts.attempts;
  }

  return getQueueAttempts();
}

const queueName = getWorkflowQueueName();
const queueConnection = getQueueRedisConnection();

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

worker.on("ready", () => {
  console.log(`[workflow-worker] listening on queue "${queueName}"`);
});

worker.on("completed", (job) => {
  console.log(
    `[workflow-worker] completed job ${job.id} execution=${job.data.executionId}`,
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
    await worker.close();
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
