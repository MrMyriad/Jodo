import { GstAuditAction, GstDocumentStatus, GstReviewStatus } from "@prisma/client";
import { createGstAuditLog } from "@/lib/gst/audit";
import type { GstExtractionJobData } from "@/lib/gst/extraction-queue";
import { prisma } from "@/lib/prisma";
import { toPrismaJson } from "@/lib/prisma-json";

export async function processGstExtractionJob(data: GstExtractionJobData) {
  const document = await prisma.gstDocument.findFirst({
    where: {
      id: data.documentId,
      userId: data.userId,
      clientId: data.clientId,
      periodId: data.periodId,
    },
    include: {
      client: true,
      period: true,
    },
  });

  if (!document) {
    throw new Error(`GST document ${data.documentId} not found.`);
  }

  await prisma.gstDocument.update({
    where: { id: document.id },
    data: { status: GstDocumentStatus.EXTRACTING, error: null },
  });

  await createGstAuditLog({
    userId: document.userId,
    clientId: document.clientId,
    periodId: document.periodId,
    action: GstAuditAction.EXTRACTION_STARTED,
    entityType: "GstDocument",
    entityId: document.id,
    message: `Started invoice extraction for ${document.originalName}.`,
  });

  const existing = await prisma.gstInvoiceExtraction.count({
    where: { sourceFileId: document.id },
  });

  if (existing === 0) {
    // TODO: Replace this provider-not-configured placeholder with OCR/LLM extraction.
    // The row is intentionally low-confidence and review-gated so it is never treated as final GST data.
    await prisma.gstInvoiceExtraction.create({
      data: {
        userId: document.userId,
        clientId: document.clientId,
        periodId: document.periodId,
        sourceFileId: document.id,
        documentType: document.documentType,
        supplierName: document.documentType === "PURCHASE_BILL" ? "Review supplier name" : document.client.businessName,
        customerName: document.documentType === "SALES_INVOICE" ? "Review customer name" : document.client.businessName,
        confidenceScore: "0.35",
        reviewStatus: GstReviewStatus.NEEDS_REVIEW,
        rawData: toPrismaJson({
          mode: "provider_not_configured_stub",
          todo: "Connect OCR/AI provider and replace this placeholder extraction.",
          sourceFileName: document.originalName,
        }),
        isDemo: document.isDemo,
      },
    });
  }

  await prisma.gstDocument.update({
    where: { id: document.id },
    data: { status: GstDocumentStatus.NEEDS_REVIEW },
  });

  await createGstAuditLog({
    userId: document.userId,
    clientId: document.clientId,
    periodId: document.periodId,
    action: GstAuditAction.EXTRACTION_COMPLETED,
    entityType: "GstDocument",
    entityId: document.id,
    message: `Extraction stub completed for ${document.originalName}; manual review required.`,
    metadata: { provider: "TODO", confidence: 0.35 },
  });
}
