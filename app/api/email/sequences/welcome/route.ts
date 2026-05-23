import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWelcomeSequence } from "@/lib/email/sequences";

const requestSchema = z.object({
  userId: z.string().trim().min(1).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const targetUserId = parsed.data.userId ?? session.user.id;
  const isSelf = targetUserId === session.user.id;
  if (!isSelf) {
    return NextResponse.json(
      { error: "You can only trigger your own welcome sequence." },
      { status: 403 },
    );
  }

  if (!process.env.DATABASE_URL || targetUserId.startsWith("dev:")) {
    return NextResponse.json(
      { error: "Welcome sequence requires a persisted database user." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  try {
    const result = await sendWelcomeSequence({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to trigger welcome sequence.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

