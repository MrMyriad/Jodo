import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { GstAuditAction } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { createGstAuditLog } from "@/lib/gst/audit";
import { isGstDeskEnabled, getGstDeskDisabledMessage } from "@/lib/gst/config";
import { prisma } from "@/lib/prisma";

const columns = [
  "invoiceNumber",
  "invoiceDate",
  "supplierName",
  "supplierGstin",
  "customerName",
  "customerGstin",
  "placeOfSupply",
  "taxableValue",
  "cgst",
  "sgst",
  "igst",
  "totalAmount",
  "documentType",
  "sourceFileId",
  "confidenceScore",
  "reviewStatus",
];

function cell(value: unknown): string {
  if (value === null || typeof value === "undefined") return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function csvEscape(value: unknown): string {
  const raw = cell(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function htmlEscape(value: unknown): string {
  return cell(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(req: Request) {
  if (!isGstDeskEnabled()) {
    return NextResponse.json({ error: getGstDeskDisabledMessage() }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const periodId = searchParams.get("periodId");
  const format = searchParams.get("format") === "xls" ? "xls" : "csv";

  if (!periodId) {
    return NextResponse.json({ error: "periodId is required." }, { status: 400 });
  }

  const period = await prisma.gstPeriod.findFirst({
    where: { id: periodId, userId: session.user.id },
    include: { client: true },
  });
  if (!period) {
    return NextResponse.json({ error: "GST period not found." }, { status: 404 });
  }

  const rows = await prisma.gstInvoiceExtraction.findMany({
    where: { userId: session.user.id, periodId: period.id },
    orderBy: { createdAt: "asc" },
  });

  await createGstAuditLog({
    userId: session.user.id,
    clientId: period.clientId,
    periodId: period.id,
    action: GstAuditAction.EXPORT_CREATED,
    entityType: "GstPeriod",
    entityId: period.id,
    message: `Exported ${rows.length} GST extraction rows as ${format.toUpperCase()}.`,
    metadata: { format, rows: rows.length },
  });

  const filenameBase = `${period.client.businessName}-${period.label}`.replace(/[^a-zA-Z0-9._-]+/g, "-");

  if (format === "xls") {
    const htmlRows = rows
      .map((row) => `<tr>${columns.map((column) => `<td>${htmlEscape((row as unknown as Record<string, unknown>)[column])}</td>`).join("")}</tr>`)
      .join("\n");
    const html = `<table><thead><tr>${columns.map((column) => `<th>${htmlEscape(column)}</th>`).join("")}</tr></thead><tbody>${htmlRows}</tbody></table>`;
    return new Response(html, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.xls"`,
      },
    });
  }

  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape((row as unknown as Record<string, unknown>)[column])).join(",")),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
    },
  });
}
