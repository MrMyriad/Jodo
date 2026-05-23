import axios from "axios";
import { isMockIntegrationModeEnabled } from "@/lib/integrations/mock-mode";

export type ZohoBooksCredentials = {
  accessToken: string;
  organizationId: string;
  apiDomain?: string | null;
};

export type ZohoInvoiceLineItem = {
  name: string;
  quantity: number;
  rate: number;
};

type ZohoInvoiceResponse = {
  code: number;
  message: string;
  invoice: {
    invoice_id: string;
    invoice_number: string;
    status: string;
    total: number;
    invoice_url?: string;
    pdf_url?: string;
    customer_name?: string;
  };
};

function resolveZohoApiDomain(credentials: ZohoBooksCredentials): string {
  return (
    credentials.apiDomain?.trim() ||
    process.env.ZOHO_API_DOMAIN?.trim() ||
    "https://www.zohoapis.in"
  );
}

export async function createZohoInvoice(input: {
  credentials: ZohoBooksCredentials;
  customerName: string;
  customerEmail?: string | null;
  items: ZohoInvoiceLineItem[];
  gstRate?: number;
}) {
  const { credentials, customerName, customerEmail, items } = input;

  if (isMockIntegrationModeEnabled()) {
    const id = `inv_mock_${Date.now()}`;
    return {
      code: 0,
      message: "success",
      invoice: {
        invoice_id: id,
        invoice_number: `INV-MOCK-${Date.now()}`,
        status: "sent",
        total: items.reduce((sum, item) => sum + item.quantity * item.rate, 0),
        invoice_url: `https://mock.zoho.local/invoices/${id}`,
        pdf_url: `https://mock.zoho.local/invoices/${id}.pdf`,
        customer_name: customerName,
      },
    } satisfies ZohoInvoiceResponse;
  }

  const apiDomain = resolveZohoApiDomain(credentials);
  const response = await axios.post(
    `${apiDomain}/books/v3/invoices`,
    {
      customer_name: customerName,
      customer_email: customerEmail ?? undefined,
      date: new Date().toISOString().slice(0, 10),
      line_items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        rate: item.rate,
      })),
      is_inclusive_tax: false,
    },
    {
      params: {
        organization_id: credentials.organizationId,
      },
      headers: {
        Authorization: `Zoho-oauthtoken ${credentials.accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );

  return response.data as ZohoInvoiceResponse;
}

export async function testZohoBooksCredentials(
  credentials: ZohoBooksCredentials,
) {
  if (isMockIntegrationModeEnabled()) {
    return {
      ok: true,
      organization: {
        organization_id: credentials.organizationId,
        name: "Mock Organization",
      },
      mock: true,
    };
  }

  const apiDomain = resolveZohoApiDomain(credentials);
  const response = await axios.get(`${apiDomain}/books/v3/organizations`, {
    headers: {
      Authorization: `Zoho-oauthtoken ${credentials.accessToken}`,
    },
    timeout: 15000,
  });

  const data = response.data as unknown as {
    organizations?: Array<{ organization_id: string; name: string }>;
  };

  const match = data.organizations?.find(
    (org) => org.organization_id === credentials.organizationId,
  );
  if (!match) {
    throw new Error(
      "Zoho Books verification failed: organizationId not found for this access token.",
    );
  }

  return { ok: true, organization: match };
}

export function buildZohoInvoicePdfLink(
  credentials: ZohoBooksCredentials,
  invoiceId: string,
) {
  const apiDomain = resolveZohoApiDomain(credentials);
  const encodedId = encodeURIComponent(invoiceId);
  const orgId = encodeURIComponent(credentials.organizationId);
  return `${apiDomain}/books/v3/invoices/${encodedId}?organization_id=${orgId}&accept=pdf`;
}

