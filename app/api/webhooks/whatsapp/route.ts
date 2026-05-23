import { NextResponse } from "next/server";
import { executeWorkflowsForTriggerTypes } from "@/lib/automation-engine";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

type WhatsAppWebhookBody = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: {
          phone_number_id?: string;
          display_phone_number?: string;
        };
        contacts?: Array<{
          wa_id?: string;
          profile?: {
            name?: string;
          };
        }>;
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          text?: {
            body?: string;
          };
          type?: string;
        }>;
      };
    }>;
  }>;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() ??
    process.env.WHATSAPP_VERIFY_TOKEN?.trim();

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

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, rateLimitPolicies.webhook);
  if (limited) return limited;

  let payload: WhatsAppWebhookBody;
  try {
    payload = (await req.json()) as WhatsAppWebhookBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const messageItems =
    payload.entry?.flatMap((entry) =>
      (entry.changes ?? []).flatMap((change) => {
        const value = change.value;
        const contact = value?.contacts?.[0];
        return (value?.messages ?? []).map((message) => ({
          message,
          contact,
          metadata: value?.metadata,
        }));
      }),
    ) ?? [];

  if (messageItems.length === 0) {
    return NextResponse.json({ status: "ignored", reason: "no_messages" });
  }

  let matched = 0;
  let queued = 0;
  let inlineExecuted = 0;
  let failedToStart = 0;

  for (const item of messageItems) {
    const triggerData = {
      source: "whatsapp",
      event: "message_received",
      messageId: item.message.id ?? null,
      from: item.message.from ?? null,
      text: item.message.text?.body ?? null,
      type: item.message.type ?? "text",
      timestamp: item.message.timestamp ?? null,
      phoneNumberId: item.metadata?.phone_number_id ?? null,
      customer: {
        name: item.contact?.profile?.name ?? null,
        phone: item.contact?.wa_id ?? item.message.from ?? null,
      },
    };

    const result = await executeWorkflowsForTriggerTypes(
      ["whatsapp.message_received", "whatsapp_message"],
      triggerData,
      {
        source: "webhook:whatsapp",
      },
    );

    matched += result.matched;
    queued += result.queued;
    inlineExecuted += result.inlineExecuted;
    failedToStart += result.failedToStart;
  }

  return NextResponse.json({
    status: "ok",
    messages: messageItems.length,
    workflowsMatched: matched,
    workflowsQueued: queued,
    workflowsInlineExecuted: inlineExecuted,
    workflowsFailedToStart: failedToStart,
  });
}
