import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getActiveIntegrationCredentials } from "@/lib/integration-connection";
import {
  createWhatsAppTemplate,
  listWhatsAppTemplates,
  type WhatsAppConfig,
} from "@/lib/integrations/whatsapp";

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

const createTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/i, "Use letters, numbers, or underscores only."),
  language: z.string().trim().min(2),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  bodyText: z.string().trim().min(5),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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
    const templates = await listWhatsAppTemplates(config, 25);
    return NextResponse.json({ templates: templates.data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list templates.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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

  const parsed = createTemplateSchema.safeParse(body);
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
    const template = await createWhatsAppTemplate(config, parsed.data);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create template.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

