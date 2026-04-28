import crypto from "crypto";
import { NextResponse } from "next/server";
import { executeWorkflowsForTriggerTypes } from "@/lib/automation-engine";
import { decryptConnectionCredentials } from "@/lib/connection-service";
import { prisma } from "@/lib/prisma";

type RazorpayEventPayload = {
  event: string;
  account_id?: string;
  created_at?: number;
  payload?: {
    payment?: {
      entity?: Record<string, unknown>;
    };
    refund?: {
      entity?: Record<string, unknown>;
    };
  };
};

function verifyRazorpaySignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function mapEventToTriggerTypes(eventName: string): string[] {
  switch (eventName) {
    case "payment.captured":
      return [
        "razorpay.payment_captured",
        "razorpay_payment",
        "razorpay_payment_captured",
      ];
    case "payment.failed":
      return ["razorpay.payment_failed", "razorpay_payment_failed"];
    case "refund.created":
      return ["razorpay.refund_created", "razorpay_refund"];
    default:
      return [];
  }
}

function buildTriggerData(
  event: RazorpayEventPayload,
): Record<string, unknown> {
  const payment = event.payload?.payment?.entity ?? null;
  const refund = event.payload?.refund?.entity ?? null;
  const customerEmail =
    (payment && typeof payment.email === "string" ? payment.email : null) ??
    (refund && typeof refund.email === "string" ? refund.email : null);
  const customerPhone =
    (payment && typeof payment.contact === "string" ? payment.contact : null) ??
    (refund && typeof refund.contact === "string" ? refund.contact : null);

  return {
    source: "razorpay",
    event: event.event,
    accountId: event.account_id ?? null,
    timestamp: event.created_at ?? Math.floor(Date.now() / 1000),
    payment,
    refund,
    customer: {
      email: customerEmail,
      phone: customerPhone,
    },
    payment_id: payment && typeof payment.id === "string" ? payment.id : null,
    amount:
      payment && typeof payment.amount === "number"
        ? payment.amount / 100
        : refund && typeof refund.amount === "number"
          ? refund.amount / 100
          : null,
  };
}

export async function POST(req: Request) {
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing webhook signature." },
      { status: 400 },
    );
  }

  const body = await req.text();
  const envSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  const envSecretMatched = envSecret
    ? verifyRazorpaySignature(body, signature, envSecret)
    : false;
  const matchedUserIds = new Set<string>();

  const activeRazorpayConnections = await prisma.integration.findMany({
    where: {
      type: "RAZORPAY",
      isActive: true,
    },
    select: {
      userId: true,
      credentials: true,
    },
  });

  for (const connection of activeRazorpayConnections) {
    try {
      const credentials = decryptConnectionCredentials(connection.credentials);
      const webhookSecret = credentials.webhookSecret;
      if (
        typeof webhookSecret !== "string" ||
        webhookSecret.trim().length === 0
      ) {
        continue;
      }

      if (verifyRazorpaySignature(body, signature, webhookSecret.trim())) {
        matchedUserIds.add(connection.userId);
      }
    } catch {
      continue;
    }
  }

  if (!envSecretMatched && matchedUserIds.size === 0) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  let event: RazorpayEventPayload;
  try {
    event = JSON.parse(body) as RazorpayEventPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  if (!event.event || typeof event.event !== "string") {
    return NextResponse.json(
      { error: "Event type is required." },
      { status: 400 },
    );
  }

  const triggerTypes = mapEventToTriggerTypes(event.event);
  if (triggerTypes.length === 0) {
    return NextResponse.json({
      status: "ignored",
      reason: `Unsupported Razorpay event: ${event.event}`,
    });
  }

  const triggerData = buildTriggerData(event);
  const triggerOptions = envSecretMatched
    ? {
        source: "webhook:razorpay",
      }
    : {
        userIds: [...matchedUserIds],
        source: "webhook:razorpay",
      };

  const executionResult = await executeWorkflowsForTriggerTypes(
    triggerTypes,
    triggerData,
    triggerOptions,
  );

  return NextResponse.json({
    status: "ok",
    event: event.event,
    workflowsMatched: executionResult.matched,
    workflowsQueued: executionResult.queued,
    workflowsInlineExecuted: executionResult.inlineExecuted,
    workflowsFailedToStart: executionResult.failedToStart,
    verificationScope: envSecretMatched
      ? "global-env-secret"
      : "connection-webhook-secret",
  });
}
