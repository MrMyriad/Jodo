import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPrismaJson } from "@/lib/prisma-json";

const activateSchema = z.object({
  templateKey: z.enum([
    "razorpay_whatsapp_invoice",
    "instagram_dm_whatsapp_followup",
    "missed_call_whatsapp",
  ]),
  name: z.string().trim().min(2).optional(),
  messageTemplate: z.string().trim().min(2).optional(),
  instagramReplyTemplate: z.string().trim().min(2).optional(),
});

function templateDefinition(
  templateKey: z.infer<typeof activateSchema>["templateKey"],
) {
  if (templateKey === "razorpay_whatsapp_invoice") {
    return {
      defaultName: "Razorpay Payment → Zoho Invoice → WhatsApp Receipt",
      trigger: { type: "razorpay.payment_captured" },
      steps: [
        {
          type: "zoho_create_invoice",
          config: {
            customerName: "{{customer.name}}",
            items: [{ name: "Order", quantity: 1, rate: "{{amount}}" }],
          },
        },
        {
          type: "whatsapp_send",
          config: {
            sendTo: "trigger",
            message:
              "Hi {{customer.name}}, your payment of ₹{{amount}} is received. Invoice: {{step0.invoiceUrl}}",
          },
        },
      ],
    };
  }

  if (templateKey === "instagram_dm_whatsapp_followup") {
    return {
      defaultName: "Instagram DM → WhatsApp Follow-up → Save Lead",
      trigger: { type: "instagram.dm_received" },
      steps: [
        {
          type: "instagram_reply",
          config: {
            message:
              "Thanks! Reply with your WhatsApp number (10 digits) and we’ll send the catalog instantly.",
          },
        },
        {
          type: "whatsapp_send",
          config: {
            sendTo: "trigger",
            message: "Hi! Here’s our catalog: {{catalogUrl}}",
            onMissingPhone: "skip",
          },
        },
        {
          type: "sheets_append",
          config: {
            sheetName: "Leads",
            columns: "{{customer.name}},{{customer.phone}},{{source}}",
          },
        },
      ],
    };
  }

  return {
    defaultName: "Missed Call → WhatsApp Auto Reply",
    trigger: { type: "exotel.missed_call" },
    steps: [
      {
        type: "whatsapp_send",
        config: {
          sendTo: "trigger",
          message:
            "Hi {{customer.name}}, sorry we missed your call. Here’s our menu: {{menuUrl}}",
        },
      },
    ],
  };
}

export async function POST(req: Request) {
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

  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const def = templateDefinition(parsed.data.templateKey);
  const name = parsed.data.name?.trim() || def.defaultName;

  const steps =
    parsed.data.templateKey === "razorpay_whatsapp_invoice" ||
    parsed.data.templateKey === "instagram_dm_whatsapp_followup" ||
    parsed.data.templateKey === "missed_call_whatsapp"
      ? def.steps.map((step) => {
          if (step.type === "whatsapp_send" && parsed.data.messageTemplate) {
            return {
              ...step,
              config: { ...step.config, message: parsed.data.messageTemplate },
            };
          }
          if (
            step.type === "instagram_reply" &&
            parsed.data.instagramReplyTemplate
          ) {
            return {
              ...step,
              config: {
                ...step.config,
                message: parsed.data.instagramReplyTemplate,
              },
            };
          }
          return step;
        })
      : def.steps;

  const workflow = await prisma.workflow.create({
    data: {
      userId: session.user.id,
      name,
      description: `Activated from template: ${parsed.data.templateKey}`,
      isActive: true,
      trigger: toPrismaJson(def.trigger),
      steps: steps.map((step) => toPrismaJson(step)),
    },
    select: { id: true, name: true, isActive: true },
  });

  return NextResponse.json({ workflow }, { status: 201 });
}
