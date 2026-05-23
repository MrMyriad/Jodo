import { GstChecklistStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DEFAULT_GST_CHECKLIST = [
  "Sales invoices",
  "Purchase bills",
  "Credit notes",
  "Debit notes",
  "Bank statement",
  "Expense proofs",
  "E-way bill summary",
  "Previous month adjustment notes",
];

export async function ensureDefaultChecklistItems(input: {
  userId: string;
  clientId: string;
  periodId: string;
}) {
  const existing = await prisma.gstChecklistItem.count({
    where: {
      userId: input.userId,
      clientId: input.clientId,
      periodId: input.periodId,
    },
  });

  if (existing > 0) return;

  await prisma.gstChecklistItem.createMany({
    data: DEFAULT_GST_CHECKLIST.map((title) => ({
      userId: input.userId,
      clientId: input.clientId,
      periodId: input.periodId,
      title,
      status: GstChecklistStatus.MISSING,
    })),
  });
}
