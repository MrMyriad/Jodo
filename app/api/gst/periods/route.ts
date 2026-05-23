import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { GstAuditAction } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { createGstAuditLog } from "@/lib/gst/audit";
import { ensureDefaultChecklistItems } from "@/lib/gst/checklist";
import { isGstDeskEnabled, getGstDeskDisabledMessage } from "@/lib/gst/config";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

const periodSchema = z.object({
  clientId: z.string().min(3),
  month: z.coerce.number().int().min(1).max(12),
  financialYear: z.string().trim().min(4).max(20),
  label: z.string().trim().min(2).max(80).optional(),
});

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const periods = await prisma.gstPeriod.findMany({
    where: { userId: session.user.id },
    orderBy: [{ financialYear: "desc" }, { month: "desc" }],
    include: { client: true, _count: { select: { documents: true, extractions: true, checklistItems: true } } },
  });

  return NextResponse.json({ periods });
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

  const parsed = periodSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid GST period payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const client = await prisma.gstClient.findFirst({
    where: { id: parsed.data.clientId, userId: session.user.id },
  });
  if (!client) {
    return NextResponse.json({ error: "GST client not found." }, { status: 404 });
  }

  const label = parsed.data.label?.trim() || `${monthNames[parsed.data.month - 1]} ${parsed.data.financialYear}`;
  const period = await prisma.gstPeriod.upsert({
    where: { clientId_financialYear_month: { clientId: client.id, financialYear: parsed.data.financialYear, month: parsed.data.month } },
    update: { label },
    create: {
      userId: session.user.id,
      clientId: client.id,
      month: parsed.data.month,
      financialYear: parsed.data.financialYear,
      label,
    },
  });

  await ensureDefaultChecklistItems({ userId: session.user.id, clientId: client.id, periodId: period.id });
  await createGstAuditLog({
    userId: session.user.id,
    clientId: client.id,
    periodId: period.id,
    action: GstAuditAction.PERIOD_CREATED,
    entityType: "GstPeriod",
    entityId: period.id,
    message: `Opened GST period ${period.label} for ${client.businessName}.`,
  });

  return NextResponse.json({ period }, { status: 201 });
}
