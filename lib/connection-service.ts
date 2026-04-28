import { IntegrationType } from "@prisma/client";
import { z } from "zod";
import { decryptCredentials, encryptCredentials } from "@/lib/credentials";

type JsonObject = Record<string, unknown>;

const whatsappCredentialsSchema = z.object({
  phoneNumberId: z.string().trim().min(3, "Phone number ID is required."),
  accessToken: z.string().trim().min(10, "Access token is required."),
});

const razorpayCredentialsSchema = z.object({
  keyId: z.string().trim().min(4, "Razorpay key ID is required."),
  keySecret: z.string().trim().min(8, "Razorpay key secret is required."),
  webhookSecret: z.string().trim().min(8, "Webhook secret is required."),
});

const googleSheetsCredentialsSchema = z.object({
  accessToken: z.string().trim().min(10, "Google access token is required."),
  spreadsheetId: z.string().trim().min(10, "Spreadsheet ID is required."),
  sheetName: z.string().trim().min(1, "Sheet name is required."),
});

const zohoBooksCredentialsSchema = z.object({
  accessToken: z.string().trim().min(10, "Zoho access token is required."),
  organizationId: z.string().trim().min(3, "Zoho organizationId is required."),
});

const instagramCredentialsSchema = z.object({
  accessToken: z.string().trim().min(10, "Instagram access token is required."),
  igAccountId: z.string().trim().min(3, "Instagram account ID is required."),
});

const exotelCredentialsSchema = z.object({
  apiKey: z.string().trim().min(4, "Exotel API key is required."),
  apiToken: z.string().trim().min(4, "Exotel API token is required."),
  webhookSecret: z.string().trim().min(8, "Webhook secret is required."),
});

const connectionPayloadSchema = z.object({
  type: z.nativeEnum(IntegrationType),
  name: z.string().trim().min(2, "Connection name is required."),
  credentials: z.record(z.string(), z.unknown()),
});

const integrationTypesWithForm = new Set<IntegrationType>([
  "WHATSAPP_BUSINESS",
  "RAZORPAY",
  "GOOGLE_SHEETS",
  "ZOHO_BOOKS",
  "INSTAGRAM",
  "EXOTEL",
]);

type ParsedConnectionPayload = {
  type: IntegrationType;
  name: string;
  credentials: JsonObject;
};

function assertSupportedConnectionType(type: IntegrationType) {
  if (!integrationTypesWithForm.has(type)) {
    throw new Error(
      `Connection type ${type} is not supported in setup form yet.`,
    );
  }
}

export function parseConnectionPayload(
  input: unknown,
): ParsedConnectionPayload {
  const parsed = connectionPayloadSchema.parse(input);
  assertSupportedConnectionType(parsed.type);

  if (parsed.type === "WHATSAPP_BUSINESS") {
    const credentials = whatsappCredentialsSchema.parse(parsed.credentials);
    return {
      type: parsed.type,
      name: parsed.name,
      credentials,
    };
  }

  if (parsed.type === "RAZORPAY") {
    const credentials = razorpayCredentialsSchema.parse(parsed.credentials);
    return {
      type: parsed.type,
      name: parsed.name,
      credentials,
    };
  }

  if (parsed.type === "ZOHO_BOOKS") {
    const credentials = zohoBooksCredentialsSchema.parse(parsed.credentials);
    return {
      type: parsed.type,
      name: parsed.name,
      credentials,
    };
  }

  if (parsed.type === "INSTAGRAM") {
    const credentials = instagramCredentialsSchema.parse(parsed.credentials);
    return { type: parsed.type, name: parsed.name, credentials };
  }

  if (parsed.type === "EXOTEL") {
    const credentials = exotelCredentialsSchema.parse(parsed.credentials);
    return { type: parsed.type, name: parsed.name, credentials };
  }

  const credentials = googleSheetsCredentialsSchema.parse(parsed.credentials);
  return {
    type: parsed.type,
    name: parsed.name,
    credentials,
  };
}

export function encryptConnectionCredentials(
  credentials: JsonObject,
): JsonObject {
  return encryptCredentials(credentials) as unknown as JsonObject;
}

export function decryptConnectionCredentials(credentials: unknown): JsonObject {
  return decryptCredentials(credentials);
}

async function testWhatsAppConnection(credentials: JsonObject) {
  const parsed = whatsappCredentialsSchema.parse(credentials);
  const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(parsed.phoneNumberId)}?fields=id,display_phone_number`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${parsed.accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `WhatsApp verification failed (${response.status}): ${message}`,
    );
  }

  const data = (await response.json()) as Record<string, unknown>;
  return {
    ok: true,
    details: {
      phoneNumberId: data.id ?? parsed.phoneNumberId,
      displayPhoneNumber: data.display_phone_number ?? null,
    },
  };
}

async function testRazorpayConnection(credentials: JsonObject) {
  const parsed = razorpayCredentialsSchema.parse(credentials);
  const token = Buffer.from(
    `${parsed.keyId}:${parsed.keySecret}`,
    "utf8",
  ).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/items?count=1", {
    headers: {
      Authorization: `Basic ${token}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Razorpay verification failed (${response.status}): ${message}`,
    );
  }

  const data = (await response.json()) as Record<string, unknown>;
  return {
    ok: true,
    details: {
      itemCount: Array.isArray(data.items) ? data.items.length : 0,
    },
  };
}

async function testGoogleSheetsConnection(credentials: JsonObject) {
  const parsed = googleSheetsCredentialsSchema.parse(credentials);
  const encodedRange = encodeURIComponent(`${parsed.sheetName}!A1:A1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${parsed.spreadsheetId}/values/${encodedRange}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${parsed.accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Google Sheets verification failed (${response.status}): ${message}`,
    );
  }

  const data = (await response.json()) as Record<string, unknown>;
  return {
    ok: true,
    details: {
      range: data.range ?? `${parsed.sheetName}!A1:A1`,
    },
  };
}

export async function testConnectionByType(
  type: IntegrationType,
  credentials: JsonObject,
) {
  assertSupportedConnectionType(type);

  if (type === "WHATSAPP_BUSINESS") {
    return testWhatsAppConnection(credentials);
  }

  if (type === "RAZORPAY") {
    return testRazorpayConnection(credentials);
  }

  if (type === "ZOHO_BOOKS") {
    const { testZohoBooksCredentials } =
      await import("@/lib/integrations/zoho-books");
    const parsed = zohoBooksCredentialsSchema.parse(credentials);
    return testZohoBooksCredentials(parsed);
  }

  if (type === "INSTAGRAM") {
    const { testInstagramCredentials } =
      await import("@/lib/integrations/instagram");
    const parsed = instagramCredentialsSchema.parse(credentials);
    return testInstagramCredentials(parsed);
  }

  if (type === "EXOTEL") {
    const parsed = exotelCredentialsSchema.parse(credentials);
    return {
      ok: true,
      details: {
        account: "exotel",
        webhookSecretSet: Boolean(parsed.webhookSecret),
      },
    };
  }

  return testGoogleSheetsConnection(credentials);
}
