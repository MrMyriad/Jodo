import { NextResponse } from "next/server";
import { getQueueRedisConnection } from "@/lib/queue/redis";
import { isQueueConfigured } from "@/lib/queue/config";

type RateLimitPolicy = {
  bucket: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  reason?: string;
};

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "local";
}

function headersFor(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": Math.max(0, result.remaining).toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
  };
}

function memoryRateLimit(key: string, policy: RateLimitPolicy): RateLimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(key);
  const active = existing && existing.resetAt > now
    ? existing
    : { count: 0, resetAt: now + policy.windowMs };

  active.count += 1;
  memoryBuckets.set(key, active);

  return {
    allowed: active.count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(policy.limit - active.count, 0),
    resetAt: active.resetAt,
  };
}

export async function checkRateLimit(
  req: Request,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const ip = getClientIp(req);
  const now = Date.now();
  const windowId = Math.floor(now / policy.windowMs);
  const resetAt = (windowId + 1) * policy.windowMs;
  const key = `jodo:rate:${policy.bucket}:${ip}:${windowId}`;

  if (!isQueueConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return {
        allowed: false,
        limit: policy.limit,
        remaining: 0,
        resetAt,
        reason: "Redis is required for production rate limiting.",
      };
    }

    return memoryRateLimit(key, policy);
  }

  try {
    const redis = getQueueRedisConnection();
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.pexpire(key, policy.windowMs);
    }

    return {
      allowed: count <= policy.limit,
      limit: policy.limit,
      remaining: Math.max(policy.limit - count, 0),
      resetAt,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      return memoryRateLimit(key, policy);
    }

    return {
      allowed: false,
      limit: policy.limit,
      remaining: 0,
      resetAt,
      reason:
        error instanceof Error
          ? `Rate limit backend failed: ${error.message}`
          : "Rate limit backend failed.",
    };
  }
}

export async function enforceRateLimit(
  req: Request,
  policy: RateLimitPolicy,
): Promise<NextResponse | null> {
  const result = await checkRateLimit(req, policy);
  if (result.allowed) {
    return null;
  }

  const status = result.reason?.includes("Redis is required") ? 503 : 429;
  return NextResponse.json(
    {
      error: status === 429 ? "Too many requests." : "Rate limiting unavailable.",
      reason: result.reason,
    },
    {
      status,
      headers: {
        ...headersFor(result),
        "Retry-After": Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)).toString(),
      },
    },
  );
}

export const rateLimitPolicies = {
  auth: { bucket: "auth", limit: 20, windowMs: 60_000 },
  connectionWrite: { bucket: "connection-write", limit: 30, windowMs: 60_000 },
  workflowWrite: { bucket: "workflow-write", limit: 60, windowMs: 60_000 },
  workflowExecute: { bucket: "workflow-execute", limit: 30, windowMs: 60_000 },
  webhook: { bucket: "webhook", limit: 240, windowMs: 60_000 },
};
