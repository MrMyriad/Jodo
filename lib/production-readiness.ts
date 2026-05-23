import { existsSync } from "node:fs";
import { join } from "node:path";

export type StackCheckStatus = "PASS" | "FAIL" | "BLOCKED";

export type EnvGroup = {
  id: string;
  label: string;
  keys: string[];
  requiredFor: string;
};

export type EnvGroupResult = EnvGroup & {
  present: string[];
  missing: string[];
  status: StackCheckStatus;
};

export const REQUIRED_ENV_GROUPS: EnvGroup[] = [
  {
    id: "app",
    label: "App URL",
    keys: ["NEXT_PUBLIC_APP_URL", "NEXTAUTH_URL"],
    requiredFor: "hosting callbacks, webhooks, and browser audits",
  },
  {
    id: "database",
    label: "Database",
    keys: ["DATABASE_URL", "DIRECT_URL"],
    requiredFor: "Prisma PostgreSQL persistence",
  },
  {
    id: "auth",
    label: "Auth",
    keys: ["NEXTAUTH_SECRET"],
    requiredFor: "NextAuth session signing",
  },
  {
    id: "credentials-encryption",
    label: "Credential Encryption",
    keys: ["CREDENTIALS_ENCRYPTION_KEY"],
    requiredFor: "encrypted integration credentials at rest",
  },
  {
    id: "redis",
    label: "Redis Queue",
    keys: ["REDIS_URL"],
    requiredFor: "BullMQ workflow processing and production rate limiting",
  },
  {
    id: "google-oauth",
    label: "Google OAuth",
    keys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    requiredFor: "Google sign-in and Google Sheets OAuth",
  },
  {
    id: "email",
    label: "Email Magic Links",
    keys: ["EMAIL_SERVER_HOST", "EMAIL_SERVER_USER", "EMAIL_SERVER_PASSWORD", "EMAIL_FROM"],
    requiredFor: "email sign-in links",
  },
  {
    id: "resend",
    label: "Resend Email",
    keys: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    requiredFor: "product email sequences",
  },
  {
    id: "razorpay",
    label: "Razorpay",
    keys: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
    requiredFor: "payments, webhook verification, and subscription billing",
  },
  {
    id: "whatsapp",
    label: "WhatsApp Business",
    keys: ["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_BUSINESS_ACCOUNT_ID", "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_WEBHOOK_VERIFY_TOKEN"],
    requiredFor: "WhatsApp messaging and webhook verification",
  },
  {
    id: "meta-instagram",
    label: "Meta / Instagram",
    keys: ["META_APP_ID", "META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN"],
    requiredFor: "Instagram OAuth and DM webhooks",
  },
  {
    id: "zoho",
    label: "Zoho Books",
    keys: ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_WEBHOOK_SECRET"],
    requiredFor: "GST invoice creation and Zoho webhooks",
  },
  {
    id: "sentry",
    label: "Sentry",
    keys: ["SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN", "SENTRY_ORG", "SENTRY_PROJECT"],
    requiredFor: "error tracking and source-map upload",
  },
  {
    id: "posthog",
    label: "PostHog",
    keys: ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"],
    requiredFor: "product analytics",
  },
  {
    id: "supabase-storage",
    label: "Supabase Storage",
    keys: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET"],
    requiredFor: "file storage layer",
  },
];

function hasValue(env: NodeJS.ProcessEnv, key: string): boolean {
  const value = env[key];
  return typeof value === "string" && value.trim().length > 0;
}

export function checkEnvGroup(
  group: EnvGroup,
  env: NodeJS.ProcessEnv = process.env,
): EnvGroupResult {
  const present = group.keys.filter((key) => hasValue(env, key));
  const missing = group.keys.filter((key) => !hasValue(env, key));

  return {
    ...group,
    present,
    missing,
    status: missing.length === 0 ? "PASS" : "BLOCKED",
  };
}

export function checkEnvGroups(
  env: NodeJS.ProcessEnv = process.env,
): EnvGroupResult[] {
  return REQUIRED_ENV_GROUPS.map((group) => checkEnvGroup(group, env));
}

export function getBaseUrl(env: NodeJS.ProcessEnv = process.env) {
  return (
    env.AUDIT_BASE_URL?.trim() ||
    env.NEXT_PUBLIC_APP_URL?.trim() ||
    env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3021"
  ).replace(/\/+$/, "");
}

export function requiredFileExists(relativePath: string, cwd = process.cwd()) {
  return existsSync(join(cwd, relativePath));
}
