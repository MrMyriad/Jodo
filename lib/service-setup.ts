import type { ServiceSetupType } from "@prisma/client";

export type ServiceSetupOption = {
  value: ServiceSetupType;
  label: string;
  shortLabel: string;
  description: string;
  outcome: string;
};

export const serviceSetupOptions: ServiceSetupOption[] = [
  {
    value: "RAZORPAY_RECEIPTS",
    label: "Razorpay receipt desk",
    shortLabel: "Payments",
    description:
      "Razorpay payments become GST invoices, WhatsApp receipts, and clean execution logs.",
    outcome: "Receipts sent within minutes of payment capture.",
  },
  {
    value: "GST_PREP",
    label: "GST preparation desk",
    shortLabel: "GST prep",
    description:
      "Upload invoices and purchase bills, review low-confidence rows, and export CA-ready files.",
    outcome: "CA-ready GST packets with a human review trail.",
  },
  {
    value: "D2C_ORDER_OPS",
    label: "D2C order operations",
    shortLabel: "D2C ops",
    description:
      "New orders update sheets, send customer WhatsApp updates, and alert your team.",
    outcome: "Less manual order tracking for Instagram and Shopify-style sellers.",
  },
  {
    value: "INSTAGRAM_LEAD_FOLLOWUP",
    label: "Instagram lead follow-up",
    shortLabel: "Instagram leads",
    description:
      "High-intent DMs get replies, WhatsApp follow-ups, and lead capture automatically.",
    outcome: "Faster buyer response without sitting inside Instagram all day.",
  },
  {
    value: "MISSED_CALL_RECOVERY",
    label: "Missed call recovery",
    shortLabel: "Missed calls",
    description:
      "Missed business calls trigger WhatsApp menus, catalog links, and team visibility.",
    outcome: "Recover inquiries that would otherwise disappear.",
  },
  {
    value: "CA_FIRM_BACK_OFFICE",
    label: "CA firm back office",
    shortLabel: "CA firms",
    description:
      "Client reminders, document checklists, GST review queues, and export packs for firms.",
    outcome: "A cleaner client-chasing and GST prep operating system.",
  },
];

export function getServiceSetupOption(type: ServiceSetupType) {
  return serviceSetupOptions.find((option) => option.value === type);
}

export function getServiceSetupLabel(type: ServiceSetupType): string {
  return getServiceSetupOption(type)?.label ?? type;
}

export const serviceSetupPainPoints = [
  "Payments are not followed up fast enough",
  "GST documents arrive late or messy",
  "Instagram leads are missed",
  "WhatsApp replies are manual",
  "Order sheets are updated by hand",
  "Clients need repeated reminders",
  "Team does not know which automation failed",
];

export const serviceSetupToolOptions = [
  "Razorpay",
  "WhatsApp Business",
  "Instagram",
  "Google Sheets",
  "Zoho Books",
  "Shopify",
  "Exotel",
  "Manual Excel files",
];
