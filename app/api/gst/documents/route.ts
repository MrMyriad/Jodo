import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { GstAuditAction, GstDocumentStatus, GstDocumentType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { createGstAuditLog } from "@/lib/gst/audit";
import { isGstDeskEnabled, getGstDeskDisabledMessage } from "@/lib/gst/config";
import { enqueueGstExtractionJob } from "@/lib/gst/extraction-queue";
import { getGstStorageStatus, uploadGstDocumentFile } from "@/lib/gst/storage";
import { prisma } from "@/lib/prisma";
import { isQueueConfigured } from "@/lib/queue/config";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

function parseDocumentType(value: FormDataEntryValue | null): GstDocumentType {
  const raw = typeof value === "string" ? value : "OTHER";
  return Object.values(GstDocumentType).includes(raw as GstDocumentType) ? (raw as GstDocumentType) : GstDocumentType.OTHER;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const periodId = searchParams.get("periodId") ?? undefined;

  const documents = await prisma.gstDocument.findMany({
    where: { userId: session.user.id, periodId },
    orderBy: { createdAt: "desc" },
    include: { client: true, period: true, _count: { select: { extractions: true } } },
  });

  return NextResponse.json({ documents, storage: getGstStorageStatus() });
}

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

  const form = await req.formData();
  const periodId = String(form.get("periodId") ?? "");
  const documentType = parseDocumentType(form.get("documentType"));
  const file = form.get("file");

  if (!periodId || !(file instanceof File)) {
    return NextResponse.json({ error: "periodId and file are required." }, { status: 400 });
  }

  const period = await prisma.gstPeriod.findFirst({
    where: { id: periodId, userId: session.user.id },
    include: { client: true },
  });
  if (!period) {
    return NextResponse.json({ error: "GST period not found." }, { status: 404 });
  }

  const uploaded = await uploadGstDocumentFile({
    userId: session.user.id,
    clientId: period.clientId,
    periodId: period.id,
    file,
  });

  if (!uploaded.ok) {
    return NextResponse.json(
      { status: "BLOCKED", error: uploaded.error, missing: uploaded.status.missing },
      { status: 503 },
    );
  }

  const document = await prisma.gstDocument.create({
    data: {
      userId: session.user.id,
      clientId: period.clientId,
      periodId: period.id,
      documentType,
      status: GstDocumentStatus.UPLOADED,
      originalName: file.name,
      fileName: uploaded.fileName,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      storageBucket: uploaded.bucket,
      storagePath: uploaded.path,
    },
  });

  await createGstAuditLog({
    userId: session.user.id,
    clientId: period.clientId,
    periodId: period.id,
    action: GstAuditAction.DOCUMENT_UPLOADED,
    entityType: "GstDocument",
    entityId: document.id,
    message: `Uploaded ${file.name} for ${period.client.businessName} ${period.label}.`,
  });

  let jobId: string | null = null;
  if (isQueueConfigured()) {
    try {
      const job = await enqueueGstExtractionJob({
        documentId: document.id,
        userId: session.user.id,
        clientId: period.clientId,
        periodId: period.id,
        queuedAt: new Date().toISOString(),
        source: "upload",
      });
      jobId = job.id?.toString() ?? null;
      const queuedDocument = await prisma.gstDocument.update({
        where: { id: document.id },
        data: { status: GstDocumentStatus.QUEUED, extractionJobId: jobId, error: null },
      });
      await createGstAuditLog({
        userId: session.user.id,
        clientId: period.clientId,
        periodId: period.id,
        action: GstAuditAction.EXTRACTION_QUEUED,
        entityType: "GstDocument",
        entityId: document.id,
        message: `Queued extraction for ${file.name}.`,
        metadata: { jobId },
      });

      return NextResponse.json({ document: queuedDocument, queued: true, jobId }, { status: 201 });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown BullMQ queue error.";
      const failedDocument = await prisma.gstDocument.update({
        where: { id: document.id },
        data: { status: GstDocumentStatus.FAILED, error: detail },
      });
      await createGstAuditLog({
        userId: session.user.id,
        clientId: period.clientId,
        periodId: period.id,
        action: GstAuditAction.EXTRACTION_FAILED,
        entityType: "GstDocument",
        entityId: document.id,
        message: `Uploaded ${file.name}, but extraction could not be queued.`,
        metadata: process.env.NODE_ENV === "production" ? undefined : { error: detail },
      });

      return NextResponse.json(
        {
          status: "PARTIAL_SUCCESS",
          error: "Document uploaded and saved, but extraction could not be queued.",
          document: failedDocument,
          queued: false,
          queue: {
            configured: true,
            detail: process.env.NODE_ENV === "production" ? undefined : detail,
          },
        },
        { status: 202 },
      );
    }
  }

  return NextResponse.json({ document, queued: false, jobId }, { status: 201 });
}
