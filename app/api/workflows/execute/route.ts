import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { enqueueWorkflowExecution } from "@/lib/automation-engine";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

const executeSchema = z.object({
  workflowId: z.string().min(1),
  triggerData: z.record(z.string(), z.unknown()),
});

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, rateLimitPolicies.workflowExecute);
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = executeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workflow execute payload." }, { status: 400 });
  }

  const workflow = await prisma.workflow.findFirst({
    where: {
      id: parsed.data.workflowId,
      userId: session.user.id,
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  }

  if (!workflow.isActive) {
    return NextResponse.json(
      { error: "Workflow is not active. Activate workflow before execution." },
      { status: 400 },
    );
  }

  const result = await enqueueWorkflowExecution(
    parsed.data.workflowId,
    parsed.data.triggerData,
    { source: "api:workflows.execute" },
  );

  if (!result.accepted) {
    return NextResponse.json(
      {
        error: "Execution could not be started.",
        reason: result.reason ?? "unknown",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    status: result.queued ? "queued" : "started",
    queued: result.queued,
    executionId: result.executionId ?? null,
  });
}
