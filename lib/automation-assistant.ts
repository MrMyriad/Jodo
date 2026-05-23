export type BusinessTypeId =
  | "d2c"
  | "local_service"
  | "ecommerce"
  | "agency";

export type AutomationGoalId =
  | "payment_receipts"
  | "lead_followup"
  | "order_tracking"
  | "missed_call_recovery";

export type MonthlyVolumeId = "starter" | "growing" | "busy";

export type AssistantOption<T extends string> = {
  id: T;
  label: string;
  description: string;
};

export type AssistantInput = {
  businessType: BusinessTypeId;
  goal: AutomationGoalId;
  volume: MonthlyVolumeId;
};

export type AssistantWorkflowStep = {
  label: string;
  detail: string;
};

export type AssistantRecommendation = {
  title: string;
  subtitle: string;
  templateHref: string;
  templateId: string;
  primaryOutcome: string;
  setupTime: string;
  monthlyImpact: string;
  taskEstimate: string;
  confidence: "High" | "Medium";
  requiredIntegrations: string[];
  workflow: AssistantWorkflowStep[];
  zapierGap: string[];
  launchChecklist: string[];
  messagePreview: string;
};

export const businessTypeOptions: AssistantOption<BusinessTypeId>[] = [
  {
    id: "d2c",
    label: "D2C brand",
    description: "Instagram, WhatsApp, prepaid orders, COD, repeat buyers.",
  },
  {
    id: "local_service",
    label: "Local service",
    description: "Salons, clinics, gyms, coaching, repair and appointments.",
  },
  {
    id: "ecommerce",
    label: "Small e-commerce",
    description: "Razorpay, Shiprocket, Sheets, refunds, order updates.",
  },
  {
    id: "agency",
    label: "Agency or freelancer",
    description: "Leads, client reports, forms, payments and follow-ups.",
  },
];

export const automationGoalOptions: AssistantOption<AutomationGoalId>[] = [
  {
    id: "payment_receipts",
    label: "Payment to receipt",
    description: "Send WhatsApp confirmation and invoice after payment.",
  },
  {
    id: "lead_followup",
    label: "Lead follow-up",
    description: "Turn Instagram or form leads into WhatsApp conversations.",
  },
  {
    id: "order_tracking",
    label: "Order tracking",
    description: "Keep Sheets updated when WhatsApp or Razorpay events arrive.",
  },
  {
    id: "missed_call_recovery",
    label: "Missed call recovery",
    description: "Reply instantly when a business call is missed.",
  },
];

export const monthlyVolumeOptions: AssistantOption<MonthlyVolumeId>[] = [
  {
    id: "starter",
    label: "0-100 events/mo",
    description: "You need a simple starter workflow that proves value.",
  },
  {
    id: "growing",
    label: "100-1,000 events/mo",
    description: "You need reliability, retries and clear execution logs.",
  },
  {
    id: "busy",
    label: "1,000+ events/mo",
    description: "You need task control, failure recovery and team alerts.",
  },
];

const volumeImpact: Record<
  MonthlyVolumeId,
  Pick<AssistantRecommendation, "monthlyImpact" | "taskEstimate">
> = {
  starter: {
    monthlyImpact: "Save 6-12 manual hours/month",
    taskEstimate: "Around 100-300 tasks/month",
  },
  growing: {
    monthlyImpact: "Save 20-45 manual hours/month",
    taskEstimate: "Around 1,000-3,000 tasks/month",
  },
  busy: {
    monthlyImpact: "Save 60+ manual hours/month",
    taskEstimate: "Around 5,000-10,000 tasks/month",
  },
};

const businessLanguage: Record<BusinessTypeId, string> = {
  d2c: "D2C seller flow",
  local_service: "local service booking flow",
  ecommerce: "e-commerce operations flow",
  agency: "agency client ops flow",
};

const playbooks: Record<AutomationGoalId, AssistantRecommendation> = {
  payment_receipts: {
    title: "Razorpay payment to WhatsApp receipt + GST-ready invoice",
    subtitle:
      "Best first automation when payments create repetitive customer follow-up.",
    templateHref: "/onboarding?template=razorpay_whatsapp_invoice",
    templateId: "razorpay_whatsapp_invoice",
    primaryOutcome: "Every paid customer receives a clean WhatsApp receipt fast.",
    setupTime: "8-12 minutes",
    monthlyImpact: "Save 20-45 manual hours/month",
    taskEstimate: "Around 1,000-3,000 tasks/month",
    confidence: "High",
    requiredIntegrations: ["Razorpay", "WhatsApp Business", "Zoho Books"],
    workflow: [
      {
        label: "Payment captured",
        detail: "Razorpay webhook triggers instantly after successful payment.",
      },
      {
        label: "Invoice generated",
        detail: "Create a GST-ready invoice in Zoho Books with customer data.",
      },
      {
        label: "WhatsApp sent",
        detail: "Send receipt, amount, order details and invoice link.",
      },
    ],
    zapierGap: [
      "No generic webhook mapping for the user to decode.",
      "Indian payment and WhatsApp defaults are built into the template.",
      "Execution logs explain failures in business language.",
    ],
    launchChecklist: [
      "Connect Razorpay and copy the webhook URL.",
      "Connect WhatsApp Business and send one test message.",
      "Connect Zoho Books or skip invoice step for the first run.",
      "Run a sample payment event before going live.",
    ],
    messagePreview:
      "Hi {{customer.name}}, we received your payment of Rs {{amount}}. Your invoice is ready: {{invoiceUrl}}",
  },
  lead_followup: {
    title: "Instagram DM to WhatsApp follow-up + lead sheet",
    subtitle:
      "Best when buyers ask price, catalogue or availability on Instagram.",
    templateHref: "/onboarding?template=instagram_dm_whatsapp_followup",
    templateId: "instagram_dm_whatsapp_followup",
    primaryOutcome: "Hot Instagram leads move into WhatsApp before they cool down.",
    setupTime: "6-10 minutes",
    monthlyImpact: "Save 20-45 manual hours/month",
    taskEstimate: "Around 1,000-3,000 tasks/month",
    confidence: "High",
    requiredIntegrations: ["Instagram", "WhatsApp Business", "Google Sheets"],
    workflow: [
      {
        label: "DM received",
        detail: "Detect new Instagram DM or keyword like price, buy or catalogue.",
      },
      {
        label: "Reply instantly",
        detail: "Send a friendly Instagram reply without making the customer wait.",
      },
      {
        label: "Create lead",
        detail: "Save name, handle, message and source into Google Sheets.",
      },
      {
        label: "WhatsApp follow-up",
        detail: "Send product catalogue or next-step message on WhatsApp.",
      },
    ],
    zapierGap: [
      "Built around Indian Instagram-to-WhatsApp selling behavior.",
      "Lead capture and WhatsApp follow-up are one guided setup.",
      "Templates avoid automation jargon and talk like a sales assistant.",
    ],
    launchChecklist: [
      "Connect Instagram Business account.",
      "Choose keywords that show buying intent.",
      "Connect WhatsApp Business and approve the follow-up message.",
      "Select or create a Google Sheet for leads.",
    ],
    messagePreview:
      "Thanks for messaging us. Please share your WhatsApp number and we will send the catalogue with prices.",
  },
  order_tracking: {
    title: "WhatsApp order to Google Sheet tracking",
    subtitle:
      "Best when orders arrive in chats and your team manually updates Sheets.",
    templateHref: "/workflows/new?template=whatsapp-order-sheet",
    templateId: "whatsapp-order-sheet",
    primaryOutcome: "Every order message becomes a structured row your team can use.",
    setupTime: "5-8 minutes",
    monthlyImpact: "Save 20-45 manual hours/month",
    taskEstimate: "Around 1,000-3,000 tasks/month",
    confidence: "Medium",
    requiredIntegrations: ["WhatsApp Business", "Google Sheets"],
    workflow: [
      {
        label: "Order message received",
        detail: "Listen for WhatsApp messages containing order keywords.",
      },
      {
        label: "Extract order fields",
        detail: "Capture phone, message, timestamp and customer intent.",
      },
      {
        label: "Update sheet",
        detail: "Append the order row to the team tracking spreadsheet.",
      },
    ],
    zapierGap: [
      "Optimized for chat-first order collection.",
      "Simple enough for staff to understand without Zapier training.",
      "Designed to expand into COD confirmation and shipping updates.",
    ],
    launchChecklist: [
      "Connect WhatsApp Business.",
      "Choose order keywords like order, book, buy or COD.",
      "Connect the order tracking Google Sheet.",
      "Send one test WhatsApp message and verify the row.",
    ],
    messagePreview:
      "Order received from {{from}}. Message: {{text}}. Added to your order sheet.",
  },
  missed_call_recovery: {
    title: "Missed call to WhatsApp catalogue recovery",
    subtitle:
      "Best for service businesses where every missed call can become lost revenue.",
    templateHref: "/onboarding?template=missed_call_whatsapp",
    templateId: "missed_call_whatsapp",
    primaryOutcome: "Missed callers receive a helpful WhatsApp reply instantly.",
    setupTime: "10-15 minutes",
    monthlyImpact: "Save 20-45 manual hours/month",
    taskEstimate: "Around 1,000-3,000 tasks/month",
    confidence: "High",
    requiredIntegrations: ["Exotel", "WhatsApp Business"],
    workflow: [
      {
        label: "Call missed",
        detail: "Exotel sends an event when your business number misses a call.",
      },
      {
        label: "Number verified",
        detail: "JODO reads the caller number and prepares a response.",
      },
      {
        label: "WhatsApp reply sent",
        detail: "Send menu, booking link, location or catalogue immediately.",
      },
    ],
    zapierGap: [
      "Built for Indian phone + WhatsApp recovery behavior.",
      "No need to stitch telecom webhooks manually.",
      "Failure messages tell staff exactly which connection needs attention.",
    ],
    launchChecklist: [
      "Connect Exotel or add webhook secret.",
      "Connect WhatsApp Business.",
      "Write a short recovery message with booking or catalogue link.",
      "Trigger one test missed-call event.",
    ],
    messagePreview:
      "Sorry we missed your call. Here is our menu and booking link. Reply here and our team will help.",
  },
};

function chooseGoalForBusiness(
  businessType: BusinessTypeId,
  goal: AutomationGoalId,
): AutomationGoalId {
  if (businessType === "local_service" && goal === "order_tracking") {
    return "missed_call_recovery";
  }

  if (businessType === "agency" && goal === "payment_receipts") {
    return "lead_followup";
  }

  return goal;
}

export function getAutomationRecommendation(
  input: AssistantInput,
): AssistantRecommendation {
  const recommendedGoal = chooseGoalForBusiness(
    input.businessType,
    input.goal,
  );
  const base = playbooks[recommendedGoal];
  const impact = volumeImpact[input.volume];

  return {
    ...base,
    title: `${businessLanguage[input.businessType]}: ${base.title}`,
    monthlyImpact: impact.monthlyImpact,
    taskEstimate: impact.taskEstimate,
    confidence:
      input.businessType === "agency" && input.goal === "payment_receipts"
        ? "Medium"
        : base.confidence,
  };
}

export const assistantDefaultInput: AssistantInput = {
  businessType: "d2c",
  goal: "payment_receipts",
  volume: "growing",
};
