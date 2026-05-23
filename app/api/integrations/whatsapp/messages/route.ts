import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getActiveIntegrationCredentials } from "@/lib/integration-connection";
import {
  sendWhatsAppMessage,
  type WhatsAppConfig,
} from "@/lib/integrations/whatsapp";

const sendSchema = z.object({
  to: z.string().trim().min(8),
  message: z.string().trim().min(1).max(4096),
  documentLink: z.string().trim().url().optional(),
  documentFilename: z.string().trim().min(1).optional(),
});

function toWhatsAppConfig(
  credentials: Record<string, unknown>,
): WhatsAppConfig | null {
  const phoneNumberId =
    typeof credentials.phoneNumberId === "string"
      ? credentials.phoneNumberId
      : process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken =
    typeof credentials.accessToken === "string"
      ? credentials.accessToken
      : process.env.WHATSAPP_ACCESS_TOKEN;
  const businessAccountId =
    typeof credentials.businessAccountId === "string"
      ? credentials.businessAccountId
      : process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (!phoneNumberId || !accessToken) {
    return null;
  }

  return {
    phoneNumberId,
    accessToken,
    businessAccountId,
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

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const connection = await getActiveIntegrationCredentials(
    session.user.id,
    "WHATSAPP_BUSINESS",
  );
  const config = toWhatsAppConfig(connection?.credentials ?? {});
  if (!config) {
    return NextResponse.json(
      { error: "Connect WhatsApp Business first." },
      { status: 400 },
    );
  }

  try {
    const response = await sendWhatsAppMessage(
      config,
      parsed.data.to,
      parsed.data.message,
      parsed.data.documentLink
        ? {
            documentLink: parsed.data.documentLink,
            documentFilename: parsed.data.documentFilename,
          }
        : undefined,
    );

    return NextResponse.json({
      status: "sent",
      response,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send WhatsApp message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

