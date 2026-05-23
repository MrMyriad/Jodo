import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getActiveIntegrationCredentials } from "@/lib/integration-connection";
import { replyToInstagramMessage } from "@/lib/integrations/instagram";

const replySchema = z.object({
  recipientId: z.string().trim().min(1),
  message: z.string().trim().min(1).max(1000),
});

function toInstagramCredentials(credentials: Record<string, unknown>) {
  const accessToken =
    typeof credentials.accessToken === "string"
      ? credentials.accessToken
      : null;
  const igAccountId =
    typeof credentials.igAccountId === "string" ? credentials.igAccountId : null;

  if (!accessToken || !igAccountId) {
    return null;
  }

  return {
    accessToken,
    igAccountId,
  };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const connection = await getActiveIntegrationCredentials(
    session.user.id,
    "INSTAGRAM",
  );
  const credentials = toInstagramCredentials(connection?.credentials ?? {});
  if (!credentials) {
    return NextResponse.json(
      { error: "Connect Instagram Business first." },
      { status: 400 },
    );
  }

  try {
    const response = await replyToInstagramMessage({
      credentials,
      recipientId: parsed.data.recipientId,
      message: parsed.data.message,
    });

    return NextResponse.json({
      status: "sent",
      response,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send DM reply.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

