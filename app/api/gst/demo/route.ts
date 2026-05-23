import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  GstAuditAction,
  GstChecklistStatus,
  GstDocumentStatus,
  GstDocumentType,
  GstReviewStatus,
} from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { createGstAuditLog } from "@/lib/gst/audit";
import { DEFAULT_GST_CHECKLIST } from "@/lib/gst/checklist";
import { isGstDeskEnabled, getGstDeskDisabledMessage } from "@/lib/gst/config";
import { prisma } from "@/lib/prisma";
import { toPrismaJson } from "@/lib/prisma-json";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, rateLimitPolicies.workflowWrite);
  if (limited) return limited;

  if (!isGstDeskEnabled()) {
    return NextResponse.json({ error: getGstDeskDisabledMessage() }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suffix = new Date().toISOString().slice(0, 10);
  const result = await prisma.$transaction(async (tx) => {
    const client = await tx.gstClient.create({
      data: {
        userId: session.user.id,
        businessName: `Demo Textiles ${suffix}`,
        gstin: "27AABCD1234F1Z5",
        contactName: "Demo Owner",
        email: "demo-client@example.com",
        phone: "+919876543210",
        state: "Maharashtra",
        tags: ["DEMO"],
        isDemo: true,
      },
    });

    const period = await tx.gstPeriod.create({
      data: {
        userId: session.user.id,
        clientId: client.id,
        label: "April 2026",
        month: 4,
        financialYear: "2026-27",
      },
    });

    await tx.gstChecklistItem.createMany({
      data: DEFAULT_GST_CHECKLIST.map((title, index) => ({
        userId: session.user.id,
        clientId: client.id,
        periodId: period.id,
        title,
        status: index < 3 ? GstChecklistStatus.RECEIVED : GstChecklistStatus.MISSING,
      })),
    });

    const document = await tx.gstDocument.create({
      data: {
        userId: session.user.id,
        clientId: client.id,
        periodId: period.id,
        documentType: GstDocumentType.SALES_INVOICE,
        status: GstDocumentStatus.NEEDS_REVIEW,
        originalName: "DEMO-sales-invoices-april-2026.pdf",
        fileName: "DEMO-sales-invoices-april-2026.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        isDemo: true,
      },
    });

    await tx.gstInvoiceExtraction.createMany({
      data: [
        {
          userId: session.user.id,
          clientId: client.id,
          periodId: period.id,
          sourceFileId: document.id,
          invoiceNumber: "DEMO-INV-001",
          invoiceDate: new Date("2026-04-05"),
          supplierName: client.businessName,
          supplierGstin: client.gstin,
          customerName: "Blue Kite Retail",
          customerGstin: "29AAACB1234C1Z1",
          placeOfSupply: "Karnataka",
          taxableValue: "12500.00",
          cgst: "0.00",
          sgst: "0.00",
          igst: "2250.00",
          totalAmount: "14750.00",
          documentType: GstDocumentType.SALES_INVOICE,
          confidenceScore: "0.92",
          reviewStatus: GstReviewStatus.REVIEWED,
          rawData: toPrismaJson({ mode: "demo" }),
          isDemo: true,
        },
        {
          userId: session.user.id,
          clientId: client.id,
          periodId: period.id,
          sourceFileId: document.id,
          invoiceNumber: "DEMO-LOW-002",
          invoiceDate: new Date("2026-04-11"),
          supplierName: client.businessName,
          customerName: "Review customer name",
          taxableValue: "8200.00",
          cgst: "738.00",
          sgst: "738.00",
          igst: "0.00",
          totalAmount: "9676.00",
          documentType: GstDocumentType.SALES_INVOICE,
          confidenceScore: "0.41",
          reviewStatus: GstReviewStatus.NEEDS_REVIEW,
          rawData: toPrismaJson({ mode: "demo", reason: "low confidence customer GSTIN" }),
          isDemo: true,
        },
      ],
    });

    return { client, period };
  });

  await createGstAuditLog({
    userId: session.user.id,
    clientId: result.client.id,
    periodId: result.period.id,
    action: GstAuditAction.CLIENT_CREATED,
    entityType: "GstClient",
    entityId: result.client.id,
    message: "Created clearly marked demo GST Desk workspace.",
    metadata: { demo: true },
  });

  return NextResponse.json({ client: result.client, period: result.period }, { status: 201 });
}
