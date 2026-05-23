import { JobsOptions, Queue } from "bullmq";
import {
  getDeadLetterQueueName,
  getDeadLetterRetention,
  getQueueAttempts,
  getQueueBackoffMs,
  getQueueRetentionComplete,
  getQueueRetentionFail,
  getWorkflowQueueName,
} from "@/lib/queue/config";
import { makeBullMqSafeJobId } from "@/lib/queue/job-id";
import { getQueueRedisConnection } from "@/lib/queue/redis";

export type WorkflowExecutionJobData = {
  workflowId: string;
  executionId: string;
  triggerData: Record<string, unknown>;
  source: string;
  queuedAt: string;
};

export type WorkflowDeadLetterJobData = {
  originalJobId: string;
  workflowId: string;
  executionId: string;
  triggerData: Record<string, unknown>;
  attempts: number;
  failedAt: string;
  failureReason: string;
};

let workflowQueueInstance: Queue<WorkflowExecutionJobData> | null = null;
let deadLetterQueueInstance: Queue<WorkflowDeadLetterJobData> | null = null;

export function getWorkflowQueue(): Queue<WorkflowExecutionJobData> {
  if (workflowQueueInstance) {
    return workflowQueueInstance;
  }

  workflowQueueInstance = new Queue<WorkflowExecutionJobData>(
    getWorkflowQueueName(),
    {
      connection: getQueueRedisConnection(),
      defaultJobOptions: {
        attempts: getQueueAttempts(),
        backoff: {
          type: "exponential",
          delay: getQueueBackoffMs(),
        },
        removeOnComplete: {
          count: getQueueRetentionComplete(),
        },
        removeOnFail: {
          count: getQueueRetentionFail(),
        },
      },
    },
  );

  return workflowQueueInstance;
}

export function getDeadLetterQueue(): Queue<WorkflowDeadLetterJobData> {
  if (deadLetterQueueInstance) {
    return deadLetterQueueInstance;
  }

  deadLetterQueueInstance = new Queue<WorkflowDeadLetterJobData>(
    getDeadLetterQueueName(),
    {
      connection: getQueueRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: {
          count: getDeadLetterRetention(),
        },
        removeOnFail: {
          count: getDeadLetterRetention(),
        },
      },
    },
  );

  return deadLetterQueueInstance;
}

export async function enqueueWorkflowExecutionJob(
  data: WorkflowExecutionJobData,
  options?: JobsOptions,
) {
  const queue = getWorkflowQueue();
  const rawJobId = options?.jobId?.toString() ?? `workflow-${data.executionId}-${Date.now()}`;
  const jobId = makeBullMqSafeJobId(rawJobId);

  return queue.add("workflow-execution", data, {
    ...options,
    jobId,
  });
}

export async function enqueueWorkflowDeadLetterJob(
  data: WorkflowDeadLetterJobData,
) {
  const queue = getDeadLetterQueue();
  return queue.add("workflow-dead-letter", data);
}
