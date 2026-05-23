function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseNonNegativeInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

export function getRedisQueueUrl(): string | null {
  const direct = process.env.REDIS_URL?.trim();
  if (direct) {
    return direct;
  }

  const upstashSocket = process.env.UPSTASH_REDIS_URL?.trim();
  if (upstashSocket) {
    return upstashSocket;
  }

  const legacyRestKey = process.env.UPSTASH_REDIS_REST_URL?.trim();
  if (legacyRestKey && /^rediss?:\/\//i.test(legacyRestKey)) {
    return legacyRestKey;
  }

  return null;
}

export function isQueueConfigured(): boolean {
  return Boolean(getRedisQueueUrl());
}

export function getWorkflowQueueName(): string {
  return process.env.WORKFLOW_QUEUE_NAME?.trim() || "workflow-execution";
}

export function getDeadLetterQueueName(): string {
  return (
    process.env.WORKFLOW_DEAD_LETTER_QUEUE_NAME?.trim() ||
    "workflow-dead-letter"
  );
}

export function getGstExtractionQueueName(): string {
  return process.env.GST_EXTRACTION_QUEUE_NAME?.trim() || "gst-invoice-extraction";
}

export function getWorkerHeartbeatKey(): string {
  return (
    process.env.WORKFLOW_WORKER_HEARTBEAT_KEY?.trim() ||
    `${getWorkflowQueueName()}:worker:heartbeat`
  );
}

export function getQueueAttempts(): number {
  return parsePositiveInteger(process.env.WORKFLOW_QUEUE_ATTEMPTS, 5);
}

export function getQueueBackoffMs(): number {
  return parsePositiveInteger(process.env.WORKFLOW_QUEUE_BACKOFF_MS, 5000);
}

export function getQueueConcurrency(): number {
  return parsePositiveInteger(process.env.WORKFLOW_QUEUE_CONCURRENCY, 5);
}

export function getQueueRetentionComplete(): number {
  return parseNonNegativeInteger(
    process.env.WORKFLOW_QUEUE_REMOVE_ON_COMPLETE,
    500,
  );
}

export function getQueueRetentionFail(): number {
  return parseNonNegativeInteger(
    process.env.WORKFLOW_QUEUE_REMOVE_ON_FAIL,
    2000,
  );
}

export function getDeadLetterRetention(): number {
  return parseNonNegativeInteger(
    process.env.WORKFLOW_DEAD_LETTER_RETENTION,
    5000,
  );
}
