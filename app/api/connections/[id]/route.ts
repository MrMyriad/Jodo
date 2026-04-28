import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateConnectionSchema = z.object({
  name: z.string().trim().min(2).optional(),
  isActive: z.boolean().optional(),
});

type RouteParams = {
  params: {
    id: string;
  };
};

async function getOwnedConnection(connectionId: string, userId: string) {
  return prisma.integration.findFirst({
    where: {
      id: connectionId,
      userId,
    },
    select: {
      id: true,
      userId: true,
      name: true,
      type: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await getOwnedConnection(params.id, session.user.id);
  if (!existing) {
    return NextResponse.json(
      { error: "Connection not found." },
      { status: 404 },
    );
  }

  let requestBody: unknown;
  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = updateConnectionSchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid update payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const connection = await prisma.integration.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      isActive: parsed.data.isActive,
    },
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ connection });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await getOwnedConnection(params.id, session.user.id);
  if (!existing) {
    return NextResponse.json(
      { error: "Connection not found." },
      { status: 404 },
    );
  }

  await prisma.integration.delete({
    where: { id: existing.id },
  });

  return NextResponse.json({ status: "deleted" });
}
