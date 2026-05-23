import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { GstAuditAction, GstDocumentStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { createGstAuditLog } from "@/lib/gst/audit";
import { isGstDeskEnabled, getGstDeskDisabledMessage } from "@/lib/gst/config";
import { enqueueGstExtractionJob } from "@/lib/gst/extraction-queue";
import { prisma } from "@/lib/prisma";
import { isQueueConfigured } from "@/lib/queue/config";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const limited = await enforceRateLimit(req, rateLimitPolicies.workflowExecute);
  if (limited) return limited;

  if (!isGstDeskEnabled()) {
    return NextResponse.json({ error: getGstDeskDisabledMessage() }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isQueueConfigured()) {
    return NextResponse.json({ status: "BLOCKED", error: "Redis queue is not configured." }, { status: 503 });
  }

  const document = await prisma.gstDocument.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!document) {
    return NextResponse.json({ error: "GST document not found." }, { status: 404 });
  }

  const job = await enqueueGstExtractionJob({
    documentId: document.id,
    userId: session.user.id,
    clientId: document.clientId,
    periodId: document.periodId,
    queuedAt: new Date().toISOString(),
    source: "manual-retry",
  });

  await prisma.gstDocument.update({
    where: { id: document.id },
    data: { status: GstDocumentStatus.QUEUED, extractionJobId: job.id?.toString() ?? null, error: null },
  });

  await createGstAuditLog({
    userId: session.user.id,
    clientId: document.clientId,
    periodId: document.periodId,
    action: GstAuditAction.EXTRACTION_QUEUED,
    entityType: "GstDocument",
    entityId: document.id,
    message: "Manually re-queued GST extraction.",
    metadata: { jobId: job.id?.toString() ?? null },
  });

  return NextResponse.json({ queued: true, jobId: job.id?.toString() ?? null });
}
