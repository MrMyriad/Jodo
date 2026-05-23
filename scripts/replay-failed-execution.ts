import { loadEnvConfig } from "@next/env";
import { prisma } from "@/lib/prisma";
import { enqueueWorkflowExecution } from "@/lib/automation-engine";
import { closeQueueRedisConnection } from "@/lib/queue/redis";

loadEnvConfig(process.cwd());

const executionId = process.argv[2];

async function main() {
  if (!executionId) {
    throw new Error("Usage: npm run recovery:replay -- <execution_id>");
  }

  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    select: {
      id: true,
      workflowId: true,
      triggerData: true,
      status: true,
    },
  });

  if (!execution) {
    throw new Error(`Execution ${executionId} not found.`);
  }

  const result = await enqueueWorkflowExecution(
    execution.workflowId,
    execution.triggerData as Record<string, unknown>,
    { source: `recovery:replay:${execution.id}` },
  );

  console.log(JSON.stringify({ replayedFrom: execution.id, result }, null, 2));
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          status: "BLOCKED",
          action: "recovery:replay",
          message: "Failed execution replay needs a reachable PostgreSQL database and Redis queue.",
          evidence: error instanceof Error ? error.message : "Unknown recovery replay error.",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    await closeQueueRedisConnection().catch(() => undefined);
  });
