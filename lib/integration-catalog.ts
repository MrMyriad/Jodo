import { IntegrationType } from "@prisma/client";

export type IntegrationDefinition = {
  type: IntegrationType;
  title: string;
  description: string;
  icon: string;
  category: "core" | "supporting";
};

export const integrationCatalog: IntegrationDefinition[] = [
  {
    type: "WHATSAPP_BUSINESS",
    title: "WhatsApp Business",
    description: "Send and receive WhatsApp messages using Meta Business APIs.",
    icon: "💬",
    category: "core",
  },
  {
    type: "ZOHO_BOOKS",
    title: "Zoho Books",
    description:
      "Create GST invoices, manage contacts, and sync payments to your accounting.",
    icon: "📄",
    category: "core",
  },
  {
    type: "GOOGLE_SHEETS",
    title: "Google Sheets",
    description:
      "Read and write rows in Google Sheets for orders and tracking.",
    icon: "📊",
    category: "core",
  },
  {
    type: "RAZORPAY",
    title: "Razorpay",
    description: "Receive payment events via secure Razorpay webhooks.",
    icon: "💳",
    category: "core",
  },
  {
    type: "INSTAGRAM",
    title: "Instagram",
    description:
      "Automate DMs and comment tracking for Instagram business accounts.",
    icon: "📷",
    category: "core",
  },
  {
    type: "EXOTEL",
    title: "Exotel",
    description:
      "Trigger automations on missed calls for your business number.",
    icon: "📞",
    category: "core",
  },
];
