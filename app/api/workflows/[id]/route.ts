import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPrismaJson } from "@/lib/prisma-json";

type RouteParams = {
  params: {
    id: string;
  };
};

const triggerSchema = z.object({
  type: z.string().trim().min(1),
  integrationId: z.string().trim().min(1).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const stepSchema = z.object({
  type: z.string().trim().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

const workflowUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().max(400).nullable().optional(),
  isActive: z.boolean().optional(),
  trigger: triggerSchema.optional(),
  steps: z.array(stepSchema).optional(),
});

async function getOwnedWorkflow(workflowId: string, userId: string) {
  return prisma.workflow.findFirst({
    where: {
      id: workflowId,
      userId,
    },
    select: {
      id: true,
      userId: true,
    },
  });
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, userId: session.user.id },
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

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  }

  return NextResponse.json({ workflow });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await getOwnedWorkflow(params.id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = workflowUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid update payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = {};
  if (typeof parsed.data.name === "string") updateData.name = parsed.data.name;
  if (Object.prototype.hasOwnProperty.call(parsed.data, "description"))
    updateData.description = parsed.data.description;
  if (typeof parsed.data.isActive === "boolean")
    updateData.isActive = parsed.data.isActive;
  if (typeof parsed.data.trigger === "object" && parsed.data.trigger !== null)
    updateData.trigger = toPrismaJson(parsed.data.trigger);
  if (Array.isArray(parsed.data.steps))
    updateData.steps = parsed.data.steps.map((s) => toPrismaJson(s));

  const workflow = await prisma.workflow.update({
    where: { id: existing.id },
    data: updateData as any,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      trigger: true,
      steps: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ workflow });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await getOwnedWorkflow(params.id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  }

  await prisma.workflow.delete({
    where: { id: existing.id },
  });

  return NextResponse.json({ status: "deleted" });
}
