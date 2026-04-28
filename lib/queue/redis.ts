import IORedis from "ioredis";
import { getRedisQueueUrl } from "@/lib/queue/config";

let sharedConnection: IORedis | null = null;

export function getQueueRedisConnection(): IORedis {
  if (sharedConnection) {
    return sharedConnection;
  }

  const redisUrl = getRedisQueueUrl();
  if (!redisUrl) {
    throw new Error(
      "Queue Redis URL is not configured. Set REDIS_URL or UPSTASH_REDIS_URL.",
    );
  }

  if (!/^rediss?:\/\//i.test(redisUrl)) {
    throw new Error(
      "Queue Redis URL must use redis:// or rediss://. REST URLs are not supported by BullMQ.",
    );
  }

  sharedConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });

  return sharedConnection;
}

export async function closeQueueRedisConnection() {
  if (!sharedConnection) {
    return;
  }

  await sharedConnection.quit();
  sharedConnection = null;
}
