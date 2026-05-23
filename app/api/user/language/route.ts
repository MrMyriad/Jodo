import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { normalizeLanguage } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  language: z.enum(["en", "hi"]),
});

export async function PATCH(req: Request) {
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

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid language payload." },
      { status: 400 },
    );
  }

  const language = normalizeLanguage(parsed.data.language);

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { language },
    select: {
      id: true,
      language: true,
    },
  });

  return NextResponse.json({
    status: "ok",
    user: updated,
  });
}
