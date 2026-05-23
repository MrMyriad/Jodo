import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { GstAuditAction, GstReminderChannel } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { createGstAuditLog } from "@/lib/gst/audit";
import { isGstDeskEnabled, getGstDeskDisabledMessage } from "@/lib/gst/config";
import { prisma } from "@/lib/prisma";
import { toPrismaJson } from "@/lib/prisma-json";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

const reminderSchema = z.object({
  periodId: z.string().min(3),
  channel: z.nativeEnum(GstReminderChannel).default(GstReminderChannel.WHATSAPP),
});

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

  const parsed = reminderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reminder payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const period = await prisma.gstPeriod.findFirst({
    where: { id: parsed.data.periodId, userId: session.user.id },
    include: {
      client: true,
      checklistItems: { where: { status: { in: ["MISSING", "REQUESTED"] } }, orderBy: { title: "asc" } },
    },
  });

  if (!period) {
    return NextResponse.json({ error: "GST period not found." }, { status: 404 });
  }

  const missingList = period.checklistItems.map((item) => `- ${item.title}`).join("\n") || "- No missing documents found. Please confirm final books.";
  const body = parsed.data.channel === GstReminderChannel.WHATSAPP
    ? `Hi ${period.client.contactName || period.client.businessName}, for ${period.label} GST prep, please share:\n${missingList}\n\nOnce received, we will prepare CA-ready review files. - JODO GST Desk`
    : `Hello ${period.client.contactName || period.client.businessName},\n\nWe are preparing GST data for ${period.label}. Please share the following pending documents:\n\n${missingList}\n\nRegards,\nJODO GST Desk`;

  const reminder = await prisma.gstReminderDraft.create({
    data: {
      userId: session.user.id,
      clientId: period.clientId,
      periodId: period.id,
      channel: parsed.data.channel,
      recipient: parsed.data.channel === GstReminderChannel.EMAIL ? period.client.email : period.client.phone,
      subject: parsed.data.channel === GstReminderChannel.EMAIL ? `Pending GST documents for ${period.label}` : null,
      body,
      variables: toPrismaJson({ missingItems: period.checklistItems.map((item) => item.title) }),
    },
  });

  await createGstAuditLog({
    userId: session.user.id,
    clientId: period.clientId,
    periodId: period.id,
    action: GstAuditAction.REMINDER_GENERATED,
    entityType: "GstReminderDraft",
    entityId: reminder.id,
    message: `Generated ${parsed.data.channel.toLowerCase()} reminder draft.`,
  });

  return NextResponse.json({ reminder }, { status: 201 });
}
