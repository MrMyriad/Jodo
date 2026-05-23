import crypto from "crypto";
import { NextResponse } from "next/server";
import { executeWorkflowsForTriggerTypes } from "@/lib/automation-engine";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

function verifyZohoSignature(rawBody: string, signature: string, secret: string) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, rateLimitPolicies.webhook);
  if (limited) return limited;

  const rawBody = await req.text();
  const secret = process.env.ZOHO_WEBHOOK_SECRET?.trim();
  const signature =
    req.headers.get("x-zoho-signature") ??
    req.headers.get("x-zoho-webhook-signature");

  if (secret) {
    if (!signature || !verifyZohoSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = rawBody
      ? (JSON.parse(rawBody) as Record<string, unknown>)
      : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const eventName =
    (payload.event as string | undefined) ??
    (payload.type as string | undefined) ??
    "zoho.event_received";

  const triggerData = {
    source: "zoho",
    event: eventName,
    payload,
  };

  const result = await executeWorkflowsForTriggerTypes(
    ["zoho.event_received", `zoho.${eventName}`],
    triggerData,
    {
      source: "webhook:zoho",
    },
  );

  return NextResponse.json({
    status: "ok",
    event: eventName,
    workflowsMatched: result.matched,
    workflowsQueued: result.queued,
    workflowsInlineExecuted: result.inlineExecuted,
    workflowsFailedToStart: result.failedToStart,
  });
}
