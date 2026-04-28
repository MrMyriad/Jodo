import axios from "axios";

export type ZohoBooksCredentials = {
  accessToken: string;
  organizationId: string;
};

export type ZohoInvoiceLineItem = {
  name: string;
  quantity: number;
  rate: number;
};

export async function createZohoInvoice(input: {
  credentials: ZohoBooksCredentials;
  customerName: string;
  customerEmail?: string | null;
  items: ZohoInvoiceLineItem[];
  gstRate?: number;
}) {
  const { credentials, customerName, customerEmail, items } = input;

  const response = await axios.post(
    `https://books.zoho.in/api/v3/invoices`,
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

  return response.data as unknown as {
    code: number;
    message: string;
    invoice: {
      invoice_id: string;
      invoice_number: string;
      status: string;
      total: number;
      invoice_url?: string;
      customer_name?: string;
    };
  };
}

export async function testZohoBooksCredentials(
  credentials: ZohoBooksCredentials,
) {
  const response = await axios.get(
    `https://books.zoho.in/api/v3/organizations`,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${credentials.accessToken}`,
      },
      timeout: 15000,
    },
  );

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
