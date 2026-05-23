import { loadEnvConfig } from "@next/env";
import { prisma } from "@/lib/prisma";
import { isQueueConfigured } from "@/lib/queue/config";
import { closeQueueRedisConnection } from "@/lib/queue/redis";
import { getDeadLetterQueue } from "@/lib/queue/workflow-queue";

loadEnvConfig(process.cwd());

async function main() {
  let database = {
    status: "PASS" as "PASS" | "BLOCKED",
    evidence: "Execution recovery state read from PostgreSQL.",
  };
  let failed = 0;
  let retrying = 0;
  let running = 0;
  let recentFailed: Array<{
    id: string;
    workflowId: string;
    userId: string;
    error: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }> = [];

  try {
    await prisma.$connect();
    [failed, retrying, running] = await Promise.all([
      prisma.execution.count({ where: { status: "FAILED" } }),
      prisma.execution.count({ where: { status: "RETRYING" } }),
      prisma.execution.count({ where: { status: "RUNNING" } }),
    ]);

    recentFailed = await prisma.execution.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        workflowId: true,
        userId: true,
        error: true,
        createdAt: true,
        completedAt: true,
      },
    });
  } catch (error) {
    database = {
      status: "BLOCKED",
      evidence:
        error instanceof Error
          ? error.message
          : "Cannot inspect execution recovery state until PostgreSQL is reachable.",
    };
    process.exitCode = 1;
  }

  let deadLetter = { waiting: 0, delayed: 0, failed: 0, completed: 0 };
  if (isQueueConfigured()) {
    const queue = getDeadLetterQueue();
    const counts = await queue.getJobCounts("waiting", "delayed", "failed", "completed");
    deadLetter = {
      waiting: counts.waiting ?? 0,
      delayed: counts.delayed ?? 0,
      failed: counts.failed ?? 0,
      completed: counts.completed ?? 0,
    };
  }

  console.log(JSON.stringify({ database, executions: { failed, retrying, running }, deadLetter, recentFailed }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    await closeQueueRedisConnection().catch(() => undefined);
  });
