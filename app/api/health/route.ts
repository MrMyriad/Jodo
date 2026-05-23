import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkEnvGroups } from "@/lib/production-readiness";
import { getWorkerHeartbeatKey, isQueueConfigured } from "@/lib/queue/config";
import { getQueueRedisConnection } from "@/lib/queue/redis";

export const dynamic = "force-dynamic";

type Check = {
  name: string;
  status: "PASS" | "FAIL" | "BLOCKED";
  evidence: string;
};

function responseStatus(checks: Check[]) {
  if (checks.some((check) => check.status === "FAIL")) {
    return 503;
  }
  if (checks.some((check) => check.status === "BLOCKED")) {
    return 207;
  }
  return 200;
}

async function checkDatabase(): Promise<Check> {
  if (!process.env.DATABASE_URL?.trim()) {
    return {
      name: "database",
      status: "BLOCKED",
      evidence: "DATABASE_URL is not configured.",
    };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      name: "database",
      status: "PASS",
      evidence: "PostgreSQL query succeeded.",
    };
  } catch (error) {
    return {
      name: "database",
      status: "FAIL",
      evidence: error instanceof Error ? error.message : "Database query failed.",
    };
  }
}

async function checkRedisAndWorker(): Promise<Check[]> {
  if (!isQueueConfigured()) {
    return [
      {
        name: "redis",
        status: "BLOCKED",
        evidence: "REDIS_URL or UPSTASH_REDIS_URL is not configured.",
      },
      {
        name: "workflow-worker",
        status: "BLOCKED",
        evidence: "Worker heartbeat requires Redis and npm run worker:workflow.",
      },
    ];
  }

  try {
    const redis = getQueueRedisConnection();
    const pong = await redis.ping();
    const heartbeatKey = getWorkerHeartbeatKey();
    const heartbeat = await redis.get(heartbeatKey);

    return [
      {
        name: "redis",
        status: pong === "PONG" ? "PASS" : "FAIL",
        evidence: `Redis ping returned ${pong}.`,
      },
      {
        name: "workflow-worker",
        status: heartbeat ? "PASS" : "BLOCKED",
        evidence: heartbeat
          ? `Worker heartbeat found at ${heartbeatKey}.`
          : `No worker heartbeat at ${heartbeatKey}; run npm run worker:workflow.`,
      },
    ];
  } catch (error) {
    return [
      {
        name: "redis",
        status: "FAIL",
        evidence: error instanceof Error ? error.message : "Redis ping failed.",
      },
      {
        name: "workflow-worker",
        status: "BLOCKED",
        evidence: "Worker heartbeat could not be checked because Redis failed.",
      },
    ];
  }
}

export async function GET() {
  const envChecks: Check[] = checkEnvGroups().map((group) => ({
    name: `env:${group.id}`,
    status: group.status,
    evidence:
      group.status === "PASS"
        ? `${group.label} env is configured.`
        : `Missing ${group.missing.join(", ")} for ${group.requiredFor}.`,
  }));

  const checks = [
    ...envChecks,
    await checkDatabase(),
    ...(await checkRedisAndWorker()),
  ];

  return NextResponse.json(
    {
      service: "jodo",
      checkedAt: new Date().toISOString(),
      status: checks.some((check) => check.status === "FAIL")
        ? "unhealthy"
        : checks.some((check) => check.status === "BLOCKED")
          ? "degraded"
          : "healthy",
      checks,
    },
    {
      status: responseStatus(checks),
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
