import crypto from "crypto";
import { NextResponse } from "next/server";
import { decryptConnectionCredentials } from "@/lib/connection-service";
import { prisma } from "@/lib/prisma";
import { executeWorkflowsForTriggerTypes } from "@/lib/automation-engine";

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  // Minimal shared-secret verification for missed call webhooks.
  // Exotel can be wired to include ?secret=... in webhook URL.
  const { searchParams } = new URL(req.url);
  const incomingSecret = searchParams.get("secret") ?? "";

  const bodyText = await req.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : {};
  } catch {
    payload = {};
  }

  const active = await prisma.integration.findMany({
    where: { type: "EXOTEL", isActive: true },
    select: { userId: true, credentials: true },
  });

  const matchedUsers = new Set<string>();
  for (const row of active) {
    try {
      const creds = decryptConnectionCredentials(row.credentials);
      const secret =
        typeof creds.webhookSecret === "string" ? creds.webhookSecret : "";
      if (secret && incomingSecret && timingSafeEqual(secret, incomingSecret)) {
        matchedUsers.add(row.userId);
      }
    } catch {
      continue;
    }
  }

  if (matchedUsers.size === 0) {
    return NextResponse.json(
      { error: "Invalid webhook secret." },
      { status: 401 },
    );
  }

  const from =
    (payload.From as string | undefined) ??
    (payload.from as string | undefined) ??
    null;

  const triggerData = {
    source: "exotel",
    event: "missed_call",
    from,
    payload,
  };

  const result = await executeWorkflowsForTriggerTypes(
    ["exotel.missed_call"],
    triggerData,
    {
      source: "webhook:exotel",
      userIds: [...matchedUsers],
    },
  );

  return NextResponse.json({
    status: "ok",
    workflowsMatched: result.matched,
    workflowsQueued: result.queued,
    workflowsInlineExecuted: result.inlineExecuted,
    workflowsFailedToStart: result.failedToStart,
  });
}
