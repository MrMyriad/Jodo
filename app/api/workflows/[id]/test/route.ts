import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enqueueWorkflowExecution } from "@/lib/automation-engine";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

type RouteParams = {
  params: {
    id: string;
  };
};

function parseTriggerType(triggerJson: Prisma.JsonValue): string | null {
  if (
    !triggerJson ||
    typeof triggerJson !== "object" ||
    Array.isArray(triggerJson)
  ) {
    return null;
  }

  const triggerRecord = triggerJson as Record<string, unknown>;
  const type = triggerRecord.type;
  return typeof type === "string" ? type : null;
}

function sampleTriggerData(triggerType: string): Record<string, unknown> {
  if (triggerType === "razorpay_payment") {
    return {
      source: "manual-test",
      event: "payment.captured",
      payment: {
        id: `pay_test_${Date.now()}`,
        amount: 49900,
        email: "customer@example.com",
        contact: "919876543210",
      },
      customer: {
        email: "customer@example.com",
        phone: "919876543210",
      },
      amount: 499,
      payment_id: `pay_test_${Date.now()}`,
    };
  }

  if (triggerType === "razorpay_refund") {
    return {
      source: "manual-test",
      event: "refund.created",
      refund: {
        id: `rfnd_test_${Date.now()}`,
        amount: 49900,
        email: "customer@example.com",
        contact: "919876543210",
      },
      customer: {
        email: "customer@example.com",
        phone: "919876543210",
      },
      amount: 499,
      payment_id: `pay_test_${Date.now()}`,
    };
  }

  return {
    source: "manual-test",
    event: triggerType,
    customer: {
      name: "Test Customer",
      email: "test@example.com",
      phone: "919876543210",
    },
    order_id: `ord_${Date.now()}`,
    amount: 499,
  };
}

export async function POST(req: Request, { params }: RouteParams) {
  const limited = await enforceRateLimit(req, rateLimitPolicies.workflowExecute);
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workflow = await prisma.workflow.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    select: {
      id: true,
      trigger: true,
      isActive: true,
    },
  });

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  }

  if (!workflow.isActive) {
    return NextResponse.json(
      { error: "Workflow must be active before test execution." },
      { status: 400 },
    );
  }

  let payload: unknown = null;
  try {
    payload = await req.json();
  } catch {
    payload = null;
  }

  const triggerType = parseTriggerType(workflow.trigger) ?? "manual_test";
  const triggerData =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : sampleTriggerData(triggerType);

  const enqueueResult = await enqueueWorkflowExecution(
    workflow.id,
    triggerData,
    {
      source: "manual_test",
    },
  );

  if (!enqueueResult.accepted || !enqueueResult.executionId) {
    return NextResponse.json(
      {
        error: "Workflow test could not be started.",
        reason: enqueueResult.reason ?? "unknown",
      },
      { status: 400 },
    );
  }

  const latestExecution = await prisma.execution.findFirst({
    where: {
      id: enqueueResult.executionId,
      userId: session.user.id,
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      completedAt: true,
      error: true,
    },
  });

  return NextResponse.json({
    status: enqueueResult.queued ? "queued" : "started",
    queued: enqueueResult.queued,
    execution: latestExecution,
  });
}
