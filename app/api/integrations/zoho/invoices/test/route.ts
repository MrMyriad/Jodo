import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getActiveIntegrationCredentials } from "@/lib/integration-connection";
import {
  buildZohoInvoicePdfLink,
  createZohoInvoice,
} from "@/lib/integrations/zoho-books";

const testInvoiceSchema = z.object({
  customerName: z.string().trim().min(2).default("Test Customer"),
  customerEmail: z.string().trim().email().optional(),
  itemName: z.string().trim().min(1).default("Test Item"),
  amount: z.number().positive().default(99),
});

function toZohoCredentials(credentials: Record<string, unknown>) {
  const accessToken =
    typeof credentials.accessToken === "string"
      ? credentials.accessToken
      : null;
  const organizationId =
    typeof credentials.organizationId === "string"
      ? credentials.organizationId
      : null;
  const apiDomain =
    typeof credentials.apiDomain === "string" ? credentials.apiDomain : undefined;

  if (!accessToken || !organizationId) {
    return null;
  }

  return {
    accessToken,
    organizationId,
    apiDomain,
  };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = testInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const connection = await getActiveIntegrationCredentials(
    session.user.id,
    "ZOHO_BOOKS",
  );
  const credentials = toZohoCredentials(connection?.credentials ?? {});
  if (!credentials) {
    return NextResponse.json(
      { error: "Connect Zoho Books first." },
      { status: 400 },
    );
  }

  try {
    const created = await createZohoInvoice({
      credentials,
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail ?? null,
      items: [
        {
          name: parsed.data.itemName,
          quantity: 1,
          rate: parsed.data.amount,
        },
      ],
    });

    const pdfUrl =
      created.invoice.pdf_url ??
      (created.invoice.invoice_id
        ? buildZohoInvoicePdfLink(credentials, created.invoice.invoice_id)
        : null);

    return NextResponse.json({
      status: "created",
      invoice: {
        id: created.invoice.invoice_id,
        number: created.invoice.invoice_number,
        url: created.invoice.invoice_url ?? null,
        pdfUrl,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create test invoice.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

