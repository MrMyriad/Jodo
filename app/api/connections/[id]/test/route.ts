import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  decryptConnectionCredentials,
  testConnectionByType,
} from "@/lib/connection-service";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function POST(_req: Request, { params }: RouteParams) {
  const limited = await enforceRateLimit(_req, rateLimitPolicies.connectionWrite);
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await prisma.integration.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    select: {
      id: true,
      type: true,
      name: true,
      credentials: true,
    },
  });

  if (!connection) {
    return NextResponse.json(
      { error: "Connection not found." },
      { status: 404 },
    );
  }

  let verification: unknown;
  try {
    const credentials = decryptConnectionCredentials(connection.credentials);
    verification = await testConnectionByType(connection.type, credentials);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Connection test failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({
    status: "ok",
    connection: {
      id: connection.id,
      name: connection.name,
      type: connection.type,
    },
    verification,
  });
}
