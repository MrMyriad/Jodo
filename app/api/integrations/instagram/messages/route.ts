import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveIntegrationCredentials } from "@/lib/integration-connection";
import { getRecentInstagramMessages } from "@/lib/integrations/instagram";

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

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : 5;

  try {
    const result = await getRecentInstagramMessages({
      credentials,
      limit: Number.isFinite(limit) ? limit : 5,
    });

    return NextResponse.json({
      messages: result.data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Instagram DMs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

