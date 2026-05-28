import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPrismaJson } from "@/lib/prisma-json";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

const serviceSetupTypes = [
  "GST_PREP",
  "RAZORPAY_RECEIPTS",
  "D2C_ORDER_OPS",
  "INSTAGRAM_LEAD_FOLLOWUP",
  "MISSED_CALL_RECOVERY",
  "CA_FIRM_BACK_OFFICE",
] as const;

const setupRequestSchema = z.object({
  type: z.enum(serviceSetupTypes),
  businessName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().max(100).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  email: z.string().trim().email().max(180).optional().or(z.literal("")),
  monthlyVolume: z.string().trim().max(80).optional().or(z.literal("")),
  currentTools: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  painPoints: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  preferredChannel: z.enum(["WHATSAPP", "EMAIL", "PHONE"]).default("WHATSAPP"),
  notes: z.string().trim().max(1200).optional().or(z.literal("")),
  source: z.string().trim().max(120).optional().or(z.literal("")),
});

function cleanOptional(value?: string) {
  const cleaned = value?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : null;
}

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, rateLimitPolicies.workflowWrite);
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await prisma.serviceSetupRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      status: true,
      businessName: true,
      preferredChannel: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ requests });
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, rateLimitPolicies.workflowWrite);
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = setupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid setup request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const request = await prisma.serviceSetupRequest.create({
      data: {
        userId: session.user.id,
        type: parsed.data.type,
        businessName: parsed.data.businessName,
        contactName: cleanOptional(parsed.data.contactName),
        phone: cleanOptional(parsed.data.phone),
        email: cleanOptional(parsed.data.email) ?? session.user.email ?? null,
        monthlyVolume: cleanOptional(parsed.data.monthlyVolume),
        currentTools: parsed.data.currentTools,
        painPoints: parsed.data.painPoints,
        preferredChannel: parsed.data.preferredChannel,
        notes: cleanOptional(parsed.data.notes),
        metadata: toPrismaJson({
          source: cleanOptional(parsed.data.source) ?? "done-for-you",
          submittedAt: new Date().toISOString(),
        }),
      },
      select: {
        id: true,
        type: true,
        status: true,
        businessName: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Could not create setup request.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
