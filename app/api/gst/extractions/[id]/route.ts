import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { GstAuditAction, GstReviewStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { createGstAuditLog } from "@/lib/gst/audit";
import { isGstDeskEnabled, getGstDeskDisabledMessage } from "@/lib/gst/config";
import { prisma } from "@/lib/prisma";
import { toPrismaJson } from "@/lib/prisma-json";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

const extractionPatchSchema = z.object({
  invoiceNumber: z.string().trim().optional().nullable(),
  invoiceDate: z.string().trim().optional().nullable(),
  supplierName: z.string().trim().optional().nullable(),
  supplierGstin: z.string().trim().optional().nullable(),
  customerName: z.string().trim().optional().nullable(),
  customerGstin: z.string().trim().optional().nullable(),
  placeOfSupply: z.string().trim().optional().nullable(),
  taxableValue: z.coerce.number().optional().nullable(),
  cgst: z.coerce.number().optional().nullable(),
  sgst: z.coerce.number().optional().nullable(),
  igst: z.coerce.number().optional().nullable(),
  totalAmount: z.coerce.number().optional().nullable(),
  reviewStatus: z.nativeEnum(GstReviewStatus).optional(),
  note: z.string().trim().max(1000).optional(),
});

function decimal(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : null;
}

function dateOrNull(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function text(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const limited = await enforceRateLimit(req, rateLimitPolicies.workflowWrite);
  if (limited) return limited;

  if (!isGstDeskEnabled()) {
    return NextResponse.json({ error: getGstDeskDisabledMessage() }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = extractionPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid extraction update.", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.gstInvoiceExtraction.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "GST extraction row not found." }, { status: 404 });
  }

  const reviewStatus = parsed.data.reviewStatus ?? GstReviewStatus.REVIEWED;
  const now = new Date();
  const updated = await prisma.gstInvoiceExtraction.update({
    where: { id: existing.id },
    data: {
      invoiceNumber: text(parsed.data.invoiceNumber),
      invoiceDate: dateOrNull(parsed.data.invoiceDate),
      supplierName: text(parsed.data.supplierName),
      supplierGstin: text(parsed.data.supplierGstin),
      customerName: text(parsed.data.customerName),
      customerGstin: text(parsed.data.customerGstin),
      placeOfSupply: text(parsed.data.placeOfSupply),
      taxableValue: decimal(parsed.data.taxableValue),
      cgst: decimal(parsed.data.cgst),
      sgst: decimal(parsed.data.sgst),
      igst: decimal(parsed.data.igst),
      totalAmount: decimal(parsed.data.totalAmount),
      reviewStatus,
      reviewedAt: reviewStatus === GstReviewStatus.APPROVED || reviewStatus === GstReviewStatus.REVIEWED ? now : existing.reviewedAt,
      correctedAt: now,
      correctionLog: toPrismaJson({ correctedAt: now.toISOString(), source: "manual_review" }),
    },
  });

  if (parsed.data.note) {
    await prisma.gstReviewNote.create({
      data: {
        userId: session.user.id,
        clientId: existing.clientId,
        periodId: existing.periodId,
        extractionId: existing.id,
        note: parsed.data.note,
        targetType: "GstInvoiceExtraction",
        targetId: existing.id,
      },
    });
  }

  await createGstAuditLog({
    userId: session.user.id,
    clientId: existing.clientId,
    periodId: existing.periodId,
    action: reviewStatus === GstReviewStatus.APPROVED ? GstAuditAction.INVOICE_APPROVED : GstAuditAction.INVOICE_CORRECTED,
    entityType: "GstInvoiceExtraction",
    entityId: existing.id,
    message: `Updated GST extraction row ${existing.id}.`,
    metadata: { reviewStatus },
  });

  return NextResponse.json({ extraction: updated });
}
