import { NextResponse } from "next/server";
import { executeWorkflowsForTriggerTypes } from "@/lib/automation-engine";
import { extractIndianPhoneNumber } from "@/lib/phone";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

// Meta webhook verification
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();

  if (
    mode === "subscribe" &&
    challenge &&
    verifyToken &&
    token === verifyToken
  ) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json(
    { error: "Webhook verification failed." },
    { status: 403 },
  );
}

type InstagramWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    messaging?: Array<{
      sender?: { id?: string };
      recipient?: { id?: string };
      timestamp?: number;
      message?: { mid?: string; text?: string };
    }>;
  }>;
};

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, rateLimitPolicies.webhook);
  if (limited) return limited;

  let payload: InstagramWebhookPayload;
  try {
    payload = (await req.json()) as InstagramWebhookPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const messaging = payload.entry?.flatMap((e) => e.messaging ?? []) ?? [];
  if (messaging.length === 0) {
    return NextResponse.json({ status: "ignored", reason: "no_messages" });
  }

  // We trigger once per incoming message.
  let matched = 0;
  let queued = 0;
  let inlineExecuted = 0;
  let failedToStart = 0;

  for (const item of messaging) {
    const text = item.message?.text ?? null;
    const extractedPhone = extractIndianPhoneNumber(text);
    const triggerData = {
      source: "instagram",
      event: "dm_received",
      senderId: item.sender?.id ?? null,
      recipientId: item.recipient?.id ?? null,
      text,
      timestamp: item.timestamp ?? null,
      customer: {
        phone: extractedPhone,
      },
    };

    const result = await executeWorkflowsForTriggerTypes(
      ["instagram.dm_received", "instagram_dm"],
      triggerData,
      {
        source: "webhook:instagram",
      },
    );

    matched += result.matched;
    queued += result.queued;
    inlineExecuted += result.inlineExecuted;
    failedToStart += result.failedToStart;
  }

  return NextResponse.json({
    status: "ok",
    messagingCount: messaging.length,
    workflowsMatched: matched,
    workflowsQueued: queued,
    workflowsInlineExecuted: inlineExecuted,
    workflowsFailedToStart: failedToStart,
  });
}
