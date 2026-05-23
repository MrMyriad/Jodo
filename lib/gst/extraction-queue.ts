import { JobsOptions, Queue } from "bullmq";
import {
  getGstExtractionQueueName,
  getQueueAttempts,
  getQueueBackoffMs,
  getQueueRetentionComplete,
  getQueueRetentionFail,
} from "@/lib/queue/config";
import { makeBullMqSafeJobId } from "@/lib/queue/job-id";
import { getQueueRedisConnection } from "@/lib/queue/redis";

export type GstExtractionJobData = {
  documentId: string;
  userId: string;
  clientId: string;
  periodId: string;
  queuedAt: string;
  source: "upload" | "manual-retry" | "demo";
};

let gstExtractionQueue: Queue<GstExtractionJobData> | null = null;

export function getGstExtractionQueue(): Queue<GstExtractionJobData> {
  if (gstExtractionQueue) return gstExtractionQueue;

  gstExtractionQueue = new Queue<GstExtractionJobData>(getGstExtractionQueueName(), {
    connection: getQueueRedisConnection(),
    defaultJobOptions: {
      attempts: getQueueAttempts(),
      backoff: { type: "exponential", delay: getQueueBackoffMs() },
      removeOnComplete: { count: getQueueRetentionComplete() },
      removeOnFail: { count: getQueueRetentionFail() },
    },
  });

  return gstExtractionQueue;
}

export async function enqueueGstExtractionJob(
  data: GstExtractionJobData,
  options?: JobsOptions,
) {
  const queue = getGstExtractionQueue();
  const rawJobId = options?.jobId?.toString() ?? `gst-${data.periodId}-${data.documentId}-${Date.now()}`;
  const jobId = makeBullMqSafeJobId(rawJobId);

  return queue.add("gst-invoice-extraction", data, {
    ...options,
    jobId,
  });
}
