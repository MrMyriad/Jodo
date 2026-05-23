import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { GstAuditAction } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { createGstAuditLog } from "@/lib/gst/audit";
import { isGstDeskEnabled, getGstDeskDisabledMessage } from "@/lib/gst/config";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

const clientSchema = z.object({
  businessName: z.string().trim().min(2),
  gstin: z.string().trim().max(15).optional().or(z.literal("")),
  contactName: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
});

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await prisma.gstClient.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      periods: {
        orderBy: [{ financialYear: "desc" }, { month: "desc" }],
        take: 3,
      },
      _count: { select: { documents: true, extractions: true } },
    },
  });

  return NextResponse.json({ clients });
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

  const parsed = clientSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid GST client payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const client = await prisma.gstClient.create({
    data: {
      userId: session.user.id,
      businessName: parsed.data.businessName,
      gstin: clean(parsed.data.gstin),
      contactName: clean(parsed.data.contactName),
      email: clean(parsed.data.email),
      phone: clean(parsed.data.phone),
      state: clean(parsed.data.state),
    },
  });

  await createGstAuditLog({
    userId: session.user.id,
    clientId: client.id,
    action: GstAuditAction.CLIENT_CREATED,
    entityType: "GstClient",
    entityId: client.id,
    message: `Created GST client ${client.businessName}.`,
  });

  return NextResponse.json({ client }, { status: 201 });
}
