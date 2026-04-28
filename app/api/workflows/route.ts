import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPrismaJson } from "@/lib/prisma-json";

const workflowCreateSchema = z.object({
  name: z.string().trim().min(2, "Workflow name is too short."),
  description: z.string().trim().max(400).optional(),
  isActive: z.boolean().optional().default(false),
  trigger: z.object({
    type: z.string().trim().min(2),
    integrationId: z.string().trim().min(3).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  }),
  steps: z
    .array(
      z.object({
        type: z.string().trim().min(2),
        config: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .min(1, "Add at least one step."),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workflows = await prisma.workflow.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      trigger: true,
      steps: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    workflows,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = workflowCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      plan: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (user.plan === "FREE" && parsed.data.steps.length > 5) {
    return NextResponse.json(
      { error: "Free plan allows max 5 steps per workflow." },
      { status: 403 },
    );
  }

  if (user.plan === "FREE") {
    const workflowsCount = await prisma.workflow.count({
      where: { userId: user.id },
    });
    if (workflowsCount >= 5) {
      return NextResponse.json(
        { error: "Free plan allows max 5 workflows." },
        { status: 403 },
      );
    }
  }

  const workflow = await prisma.workflow.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      trigger: toPrismaJson(parsed.data.trigger),
      steps: parsed.data.steps.map((step) => toPrismaJson(step)),
      isActive: parsed.data.isActive,
    },
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    {
      workflow,
    },
    { status: 201 },
  );
}
