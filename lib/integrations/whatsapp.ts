import { isMockIntegrationModeEnabled } from "@/lib/integrations/mock-mode";

export type WhatsAppConfig = {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId?: string;
};

export type WhatsAppSendOptions = {
  documentLink?: string;
  documentFilename?: string;
  documentCaption?: string;
  sendTextBeforeDocument?: boolean;
};

export type WhatsAppTemplateCreateInput = {
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  bodyText: string;
};

type GraphApiTemplateListResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    language?: string;
    status?: string;
    category?: string;
  }>;
};

async function postWhatsAppGraph(
  config: WhatsAppConfig,
  endpoint: string,
  payload: Record<string, unknown>,
) {
  const url = `https://graph.facebook.com/v18.0/${endpoint}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`WhatsApp API failed (${response.status}): ${details}`);
  }

  return response.json();
}

async function getWhatsAppGraph<T>(
  config: WhatsAppConfig,
  endpoint: string,
  params: URLSearchParams,
): Promise<T> {
  const url = new URL(`https://graph.facebook.com/v18.0/${endpoint}`);
  url.search = params.toString();

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`WhatsApp API failed (${response.status}): ${details}`);
  }

  return (await response.json()) as T;
}

export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  to: string,
  message: string,
  options?: WhatsAppSendOptions,
) {
  if (isMockIntegrationModeEnabled()) {
    return {
      mock: true,
      textMessageId: `wamid.mock.${Date.now()}`,
      documentMessageId: options?.documentLink
        ? `wamid.mock.doc.${Date.now()}`
        : null,
      to,
      message,
      documentLink: options?.documentLink ?? null,
    };
  }

  let textResponse: unknown = null;
  let documentResponse: unknown = null;

  const shouldSendText =
    options?.sendTextBeforeDocument !== false || !options?.documentLink;
  if (shouldSendText && message.trim().length > 0) {
    textResponse = await postWhatsAppGraph(config, `${config.phoneNumberId}/messages`, {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    });
  }

  if (options?.documentLink) {
    documentResponse = await postWhatsAppGraph(
      config,
      `${config.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "document",
        document: {
          link: options.documentLink,
          filename: options.documentFilename,
          caption: options.documentCaption,
        },
      },
    );
  }

  return {
    text: textResponse,
    document: documentResponse,
  };
}

export async function createWhatsAppTemplate(
  config: WhatsAppConfig,
  input: WhatsAppTemplateCreateInput,
) {
  if (isMockIntegrationModeEnabled()) {
    return {
      id: `tmpl_mock_${Date.now()}`,
      name: input.name,
      status: "PENDING",
      category: input.category,
      language: input.language,
      mock: true,
    };
  }

  const businessAccountId =
    config.businessAccountId?.trim() ||
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
  if (!businessAccountId) {
    throw new Error(
      "WhatsApp businessAccountId is required for template creation.",
    );
  }

  const response = await postWhatsAppGraph(config, `${businessAccountId}/message_templates`, {
    name: input.name,
    language: input.language,
    category: input.category,
    components: [
      {
        type: "BODY",
        text: input.bodyText,
      },
    ],
  });

  return response as {
    id?: string;
    status?: string;
    category?: string;
    name?: string;
    language?: string;
  };
}

export async function listWhatsAppTemplates(
  config: WhatsAppConfig,
  limit = 25,
) {
  if (isMockIntegrationModeEnabled()) {
    return {
      data: [
        {
          id: "tmpl_mock_receipt",
          name: "payment_receipt_v1",
          category: "UTILITY",
          language: "en",
          status: "APPROVED",
        },
      ],
      mock: true,
    };
  }

  const businessAccountId =
    config.businessAccountId?.trim() ||
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
  if (!businessAccountId) {
    throw new Error(
      "WhatsApp businessAccountId is required for template listing.",
    );
  }

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("fields", "id,name,status,language,category");

  const response = await getWhatsAppGraph<GraphApiTemplateListResponse>(
    config,
    `${businessAccountId}/message_templates`,
    params,
  );

  return {
    data: response.data ?? [],
  };
}

