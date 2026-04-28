import { IntegrationType } from "@prisma/client";

export type TemplateCategory = "whatsapp" | "payments" | "social";

export type WorkflowTemplate = {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  usageCount: string;
  triggerType: string;
  requiredIntegrations: IntegrationType[];
  actions: Array<{
    type: string;
    label: string;
  }>;
};

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "instagram-dm-whatsapp",
    title: "New Instagram DM → Send WhatsApp Message",
    description:
      "When someone sends an Instagram DM, send an instant WhatsApp auto-reply.",
    category: "social",
    icon: "💬",
    usageCount: "243 businesses using this",
    triggerType: "instagram_dm",
    requiredIntegrations: ["INSTAGRAM", "WHATSAPP_BUSINESS"],
    actions: [{ type: "whatsapp_send", label: "Send WhatsApp Message" }],
  },
  {
    id: "razorpay-payment-sheet",
    title: "Razorpay Payment → Add to Google Sheets",
    description:
      "Capture every payment in a spreadsheet with customer and amount details.",
    category: "payments",
    icon: "💳",
    usageCount: "311 businesses using this",
    triggerType: "razorpay_payment",
    requiredIntegrations: ["RAZORPAY", "GOOGLE_SHEETS"],
    actions: [{ type: "sheets_append", label: "Add Row in Sheet" }],
  },
  {
    id: "whatsapp-order-sheet",
    title: "WhatsApp Message → Create Google Sheet Row",
    description:
      "Track customer orders from WhatsApp conversations into Google Sheets.",
    category: "whatsapp",
    icon: "📊",
    usageCount: "196 businesses using this",
    triggerType: "whatsapp_message",
    requiredIntegrations: ["WHATSAPP_BUSINESS", "GOOGLE_SHEETS"],
    actions: [{ type: "sheets_append", label: "Add Row in Sheet" }],
  },
  {
    id: "daily-report-whatsapp",
    title: "Scheduled Daily Report",
    description:
      "Send yesterday's summary to WhatsApp every day at 9 AM automatically.",
    category: "whatsapp",
    icon: "📈",
    usageCount: "154 businesses using this",
    triggerType: "schedule_daily",
    requiredIntegrations: ["WHATSAPP_BUSINESS"],
    actions: [{ type: "whatsapp_send", label: "Send Daily Summary" }],
  },
  {
    id: "missed-call-whatsapp",
    title: "Missed Call → Auto WhatsApp Reply",
    description:
      "When you miss a call, instantly send a WhatsApp message with your menu/catalog link.",
    category: "whatsapp",
    icon: "📞",
    usageCount: "672 businesses using this",
    triggerType: "exotel.missed_call",
    requiredIntegrations: ["EXOTEL", "WHATSAPP_BUSINESS"],
    actions: [{ type: "whatsapp_send", label: "Send WhatsApp Message" }],
  },
  {
    id: "instagram-comment-sheet",
    title: "Instagram Comment → Add to Sheet",
    description:
      "Track all post comments in one spreadsheet to manage engagement.",
    category: "social",
    icon: "📣",
    usageCount: "101 businesses using this",
    triggerType: "instagram_comment",
    requiredIntegrations: ["INSTAGRAM", "GOOGLE_SHEETS"],
    actions: [{ type: "sheets_append", label: "Add Row in Sheet" }],
  },
  {
    id: "razorpay-refund-notify",
    title: "Razorpay Refund → Notify Team",
    description:
      "Instantly alert your team when a refund gets created in Razorpay.",
    category: "payments",
    icon: "↩️",
    usageCount: "72 businesses using this",
    triggerType: "razorpay_refund",
    requiredIntegrations: ["RAZORPAY", "WHATSAPP_BUSINESS"],
    actions: [{ type: "whatsapp_send", label: "Notify Team" }],
  },
  {
    id: "cod-confirmation",
    title: "COD Confirmation",
    description:
      "When COD is confirmed, update sheet and notify customer on WhatsApp.",
    category: "whatsapp",
    icon: "📦",
    usageCount: "139 businesses using this",
    triggerType: "cod_confirmation",
    requiredIntegrations: ["GOOGLE_SHEETS", "WHATSAPP_BUSINESS"],
    actions: [
      { type: "sheets_append", label: "Update Sheet" },
      { type: "whatsapp_send", label: "Send WhatsApp Message" },
    ],
  },
];

export function getTemplateById(
  templateId: string | undefined,
): WorkflowTemplate | undefined {
  if (!templateId) {
    return undefined;
  }

  return workflowTemplates.find((template) => template.id === templateId);
}
