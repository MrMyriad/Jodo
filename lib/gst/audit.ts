import { GstAuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toPrismaJson } from "@/lib/prisma-json";

type CreateGstAuditLogInput = {
  userId: string;
  clientId?: string | null;
  periodId?: string | null;
  action: GstAuditAction;
  entityType: string;
  entityId?: string | null;
  message: string;
  metadata?: Prisma.InputJsonValue | Record<string, unknown> | null;
};

export async function createGstAuditLog(input: CreateGstAuditLogInput) {
  try {
    await prisma.gstAuditLog.create({
      data: {
        userId: input.userId,
        clientId: input.clientId ?? null,
        periodId: input.periodId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        message: input.message,
        metadata: input.metadata ? toPrismaJson(input.metadata) : undefined,
      },
    });
  } catch (error) {
    console.error("[gst.audit] failed to write audit log", error);
  }
}
