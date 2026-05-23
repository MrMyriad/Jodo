export const SUPPORTED_LANGUAGES = ["en", "hi"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type TranslationKey =
  | "nav.home"
  | "nav.workflows"
  | "nav.templates"
  | "nav.connect"
  | "nav.gstDesk"
  | "nav.settings"
  | "nav.pricing"
  | "language.label"
  | "language.english"
  | "language.hindi"
  | "pricing.title"
  | "pricing.subtitle"
  | "pricing.badge";

const translations: Record<SupportedLanguage, Record<TranslationKey, string>> =
  {
    en: {
      "nav.home": "Home",
      "nav.workflows": "Workflows",
      "nav.templates": "Templates",
      "nav.connect": "Connect",
      "nav.gstDesk": "GST Desk",
      "nav.settings": "Settings",
      "nav.pricing": "Pricing",
      "language.label": "Language",
      "language.english": "English",
      "language.hindi": "Hindi",
      "pricing.title": "Simple, transparent pricing",
      "pricing.subtitle": "Start free. Upgrade when you are ready. Cancel anytime.",
      "pricing.badge": "Save Rs 2,500/month vs Zapier",
    },
    hi: {
      "nav.home": "होम",
      "nav.workflows": "वर्कफ्लो",
      "nav.templates": "टेम्पलेट",
      "nav.connect": "कनेक्ट",
      "nav.gstDesk": "GST Desk",
      "nav.settings": "सेटिंग्स",
      "nav.pricing": "प्राइसिंग",
      "language.label": "भाषा",
      "language.english": "English",
      "language.hindi": "हिंदी",
      "pricing.title": "सरल और पारदर्शी प्राइसिंग",
      "pricing.subtitle": "फ्री से शुरू करें, जरूरत पर अपग्रेड करें, कभी भी कैंसल करें।",
      "pricing.badge": "Zapier के मुकाबले हर महीने Rs 2,500 बचाएं",
    },
  };

export function normalizeLanguage(
  input: string | null | undefined,
): SupportedLanguage {
  if (!input) return "en";
  const lower = input.toLowerCase();
  if (lower === "hi") return "hi";
  return "en";
}

export function t(
  language: string | null | undefined,
  key: TranslationKey,
): string {
  const normalized = normalizeLanguage(language);
  return translations[normalized][key] ?? translations.en[key];
}
