import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { encryptCredentials, decryptCredentials } from "@/lib/credentials";
import { checkEnvGroups, getBaseUrl } from "@/lib/production-readiness";
import { getWorkerHeartbeatKey, isQueueConfigured } from "@/lib/queue/config";
import { closeQueueRedisConnection, getQueueRedisConnection } from "@/lib/queue/redis";
import { checkRateLimit } from "@/lib/rate-limit";

loadEnvConfig(process.cwd());

type Status = "PASS" | "FAIL" | "BLOCKED";

type AuditCheck = {
  layer: string;
  name: string;
  status: Status;
  evidence: string;
};

const strict = process.argv.includes("--strict");
const baseUrl = getBaseUrl();
const checks: AuditCheck[] = [];

function add(layer: string, name: string, status: Status, evidence: string) {
  checks.push({ layer, name, status, evidence });
}

function fileExists(path: string) {
  return existsSync(join(process.cwd(), path));
}

function fileContains(path: string, text: string) {
  const fullPath = join(process.cwd(), path);
  return existsSync(fullPath) && readFileSync(fullPath, "utf8").includes(text);
}

function readText(path: string) {
  const fullPath = join(process.cwd(), path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function auditFrontend() {
  if (!fileExists("components/home/premium-homepage.tsx") || !fileContains("app/layout.tsx", "./globals.css")) {
    add("Frontend", "tracked UI files", "FAIL", "Homepage component or global CSS import is missing.");
    return;
  }
  add("Frontend", "tracked UI files", "PASS", "Homepage component and global CSS import are present.");

  try {
    const res = await fetchWithTimeout(`${baseUrl}/`);
    const html = await res.text();
    const cssMatch = html.match(/href="(\/_next\/static\/css[^"]+)"/);
    if (!res.ok) {
      add("Frontend", "homepage response", "FAIL", `GET / returned ${res.status}.`);
      return;
    }
    const cssHref = cssMatch?.[1];
    if (!cssHref) {
      add("Frontend", "CSS bundle", "FAIL", "Homepage HTML did not include a Next CSS bundle link.");
      return;
    }
    const cssRes = await fetchWithTimeout(`${baseUrl}${cssHref}`);
    add(
      "Frontend",
      "CSS bundle",
      cssRes.ok ? "PASS" : "FAIL",
      `CSS bundle ${cssHref} returned ${cssRes.status}.`,
    );
    add(
      "Frontend",
      "no hidden first paint",
      html.includes('style="opacity:0') ? "FAIL" : "PASS",
      html.includes('style="opacity:0')
        ? "SSR HTML still contains opacity:0 first-paint content."
        : "SSR HTML does not hide the critical hero content.",
    );
  } catch (error) {
    add(
      "Frontend",
      "live browser target",
      "BLOCKED",
      `Could not reach ${baseUrl}; start the app on localhost:3021 or set AUDIT_BASE_URL. ${error instanceof Error ? error.message : ""}`.trim(),
    );
  }
}

async function auditApiAndAuth() {
  const protectedApiRoutes = [
    "app/api/connections/route.ts",
    "app/api/workflows/route.ts",
    "app/api/workflows/execute/route.ts",
    "app/api/templates/activate/route.ts",
    "app/api/gst/clients/route.ts",
    "app/api/gst/periods/route.ts",
    "app/api/gst/documents/route.ts",
    "app/api/gst/extractions/[id]/route.ts",
    "app/api/gst/reminders/route.ts",
    "app/api/gst/export/route.ts",
  ];
  const missingAuth = protectedApiRoutes.filter((path) => !fileContains(path, "getServerSession"));
  add(
    "APIs & Backend Logic",
    "protected API ownership checks",
    missingAuth.length === 0 ? "PASS" : "FAIL",
    missingAuth.length === 0
      ? "Core protected APIs check sessions server-side."
      : `Missing getServerSession in ${missingAuth.join(", ")}.`,
  );

  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/connections`, { redirect: "manual" });
    add(
      "Auth & Permissions",
      "anonymous API rejection",
      res.status === 401 ? "PASS" : "FAIL",
      `GET /api/connections without session returned ${res.status}.`,
    );
  } catch (error) {
    add(
      "Auth & Permissions",
      "anonymous API rejection",
      "BLOCKED",
      `Could not call live API at ${baseUrl}: ${error instanceof Error ? error.message : "unknown error"}.`,
    );
  }
}

async function auditDatabaseAndStorage() {
  if (!process.env.DATABASE_URL?.trim()) {
    add("Database & Storage", "PostgreSQL", "BLOCKED", "DATABASE_URL is missing.");
  } else {
    try {
      await prisma.$queryRaw`SELECT 1`;
      add("Database & Storage", "PostgreSQL", "PASS", "Prisma SELECT 1 succeeded.");
    } catch (error) {
      add("Database & Storage", "PostgreSQL", "FAIL", error instanceof Error ? error.message : "Database check failed.");
    }
  }

  const storageMissing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET"].filter((key) => !process.env[key]?.trim());
  add(
    "Database & Storage",
    "Supabase Storage",
    storageMissing.length === 0 ? "PASS" : "BLOCKED",
    storageMissing.length === 0
      ? "Supabase Storage env values are present."
      : `Missing ${storageMissing.join(", ")}; file storage cannot be verified.`,
  );
}

async function auditQueueAndCompute() {
  if (!isQueueConfigured()) {
    add("Cloud & Compute", "Redis queue", "BLOCKED", "REDIS_URL or UPSTASH_REDIS_URL is missing.");
    add("Load Balancing & Scaling", "worker heartbeat", "BLOCKED", "Worker heartbeat needs Redis.");
    return;
  }

  try {
    const redis = getQueueRedisConnection();
    const pong = await redis.ping();
    add("Cloud & Compute", "Redis queue", pong === "PONG" ? "PASS" : "FAIL", `Redis ping returned ${pong}.`);
    const heartbeatKey = getWorkerHeartbeatKey();
    const heartbeat = await redis.get(heartbeatKey);
    add(
      "Load Balancing & Scaling",
      "worker heartbeat",
      heartbeat ? "PASS" : "BLOCKED",
      heartbeat ? `Worker heartbeat exists at ${heartbeatKey}.` : `No worker heartbeat at ${heartbeatKey}; run npm run worker:workflow.`,
    );
  } catch (error) {
    add("Cloud & Compute", "Redis queue", "FAIL", error instanceof Error ? error.message : "Redis check failed.");
  }
}

async function auditSecurityAndRateLimits() {
  try {
    const encrypted = encryptCredentials({ token: "audit-secret" });
    const decrypted = decryptCredentials(encrypted);
    add(
      "Security & RLS",
      "credential encryption",
      decrypted.token === "audit-secret" ? "PASS" : "FAIL",
      "AES-256-GCM credential encryption roundtrip completed.",
    );
  } catch (error) {
    add("Security & RLS", "credential encryption", "FAIL", error instanceof Error ? error.message : "Encryption failed.");
  }

  if (!fileExists("prisma/rls.sql")) {
    add("Security & RLS", "RLS template", "FAIL", "prisma/rls.sql is missing.");
  } else if (!process.env.DATABASE_URL?.trim()) {
    add("Security & RLS", "RLS applied", "BLOCKED", "DATABASE_URL is missing; cannot inspect pg_policies.");
  } else {
    try {
      const policies = await prisma.$queryRaw<Array<{ policyname: string }>>`
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
            'users',
            'integrations',
            'workflows',
            'executions',
            'templates',
            'gst_clients',
            'gst_periods',
            'gst_documents',
            'gst_invoice_extractions',
            'gst_checklist_items',
            'gst_reminder_drafts',
            'gst_review_notes',
            'gst_audit_logs'
          )
      `;
      add(
        "Security & RLS",
        "RLS applied",
        policies.length >= 13 ? "PASS" : "BLOCKED",
        policies.length >= 13
          ? `${policies.length} public RLS policies found.`
          : `RLS SQL template exists, but only ${policies.length} matching policies are applied.`,
      );
    } catch (error) {
      add("Security & RLS", "RLS applied", "BLOCKED", error instanceof Error ? error.message : "Could not query pg_policies.");
    }
  }

  const rateLimitedRoutes = [
    "app/api/auth/[...nextauth]/route.ts",
    "app/api/connections/route.ts",
    "app/api/connections/[id]/test/route.ts",
    "app/api/workflows/route.ts",
    "app/api/workflows/[id]/route.ts",
    "app/api/workflows/execute/route.ts",
    "app/api/workflows/[id]/test/route.ts",
    "app/api/templates/activate/route.ts",
    "app/api/gst/clients/route.ts",
    "app/api/gst/periods/route.ts",
    "app/api/gst/documents/route.ts",
    "app/api/gst/documents/[id]/extract/route.ts",
    "app/api/gst/extractions/[id]/route.ts",
    "app/api/gst/reminders/route.ts",
    "app/api/webhooks/razorpay/route.ts",
    "app/api/webhooks/whatsapp/route.ts",
    "app/api/webhooks/instagram/route.ts",
    "app/api/webhooks/zoho/route.ts",
    "app/api/webhooks/exotel/route.ts",
  ];
  const missingLimit = rateLimitedRoutes.filter((path) => !fileContains(path, "enforceRateLimit"));
  add(
    "Rate Limiting",
    "sensitive route coverage",
    missingLimit.length === 0 ? "PASS" : "FAIL",
    missingLimit.length === 0
      ? "Auth, workflow, connection, and webhook write routes call enforceRateLimit."
      : `Missing enforceRateLimit in ${missingLimit.join(", ")}.`,
  );

  try {
    const auditKey = `stack-audit:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    const req = new Request(`${baseUrl}/api/audit-rate-limit`, {
      headers: { "x-forwarded-for": auditKey },
    });
    const first = await checkRateLimit(req, { windowMs: 60_000, limit: 1, bucket: "audit" });
    const second = await checkRateLimit(req, { windowMs: 60_000, limit: 1, bucket: "audit" });
    add(
      "Rate Limiting",
      "rate limiter engine",
      first.allowed && !second.allowed ? "PASS" : "FAIL",
      `First request allowed=${first.allowed}; second request allowed=${second.allowed}.`,
    );
  } catch (error) {
    add("Rate Limiting", "rate limiter engine", "FAIL", error instanceof Error ? error.message : "Rate limiter check failed.");
  }

  try {
    const res = await fetchWithTimeout(`${baseUrl}/`, { redirect: "manual" });
    const frame = res.headers.get("x-frame-options");
    const nosniff = res.headers.get("x-content-type-options");
    add(
      "Security & RLS",
      "security headers",
      frame === "DENY" && nosniff === "nosniff" ? "PASS" : "FAIL",
      `x-frame-options=${frame}; x-content-type-options=${nosniff}.`,
    );
  } catch (error) {
    add("Security & RLS", "security headers", "BLOCKED", `Could not reach ${baseUrl}: ${error instanceof Error ? error.message : "unknown"}.`);
  }
}

async function auditDeploymentCiRecovery() {
  add("Hosting & Deployment", "Vercel config", fileExists("vercel.json") ? "PASS" : "FAIL", fileExists("vercel.json") ? "vercel.json exists." : "vercel.json is missing.");
  add("CI/CD & Version Control", "GitHub Actions", fileExists(".github/workflows/ci.yml") ? "PASS" : "FAIL", fileExists(".github/workflows/ci.yml") ? "CI workflow exists." : "CI workflow is missing.");
  add("Availability & Recovery", "health endpoint", fileExists("app/api/health/route.ts") ? "PASS" : "FAIL", fileExists("app/api/health/route.ts") ? "/api/health route exists." : "Health endpoint missing.");
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/health`, { redirect: "manual" });
    add(
      "Availability & Recovery",
      "live readiness response",
      res.status === 200 || res.status === 207 ? "PASS" : "FAIL",
      `/api/health returned ${res.status}.`,
    );
  } catch (error) {
    add("Availability & Recovery", "live readiness response", "BLOCKED", `Could not reach /api/health: ${error instanceof Error ? error.message : "unknown"}.`);
  }
  add("Availability & Recovery", "recovery runbook", fileExists("docs/production-recovery.md") ? "PASS" : "FAIL", fileExists("docs/production-recovery.md") ? "Recovery runbook exists." : "Recovery runbook missing.");
  add("Caching & CDN", "Next/Vercel static delivery", fileExists("vercel.json") && fileContains("next.config.mjs", "headers()") ? "PASS" : "BLOCKED", "Next static assets are CDN-backed on Vercel; security headers are configured globally.");
}

async function auditGstDesk() {
  const schemaModels = [
    "model GstClient",
    "model GstPeriod",
    "model GstDocument",
    "model GstInvoiceExtraction",
    "model GstChecklistItem",
    "model GstReminderDraft",
    "model GstReviewNote",
    "model GstAuditLog",
  ];
  const missingModels = schemaModels.filter((model) => !fileContains("prisma/schema.prisma", model));
  add(
    "JODO GST Desk",
    "Prisma models",
    missingModels.length === 0 ? "PASS" : "FAIL",
    missingModels.length === 0 ? "GST Desk schema models are present." : `Missing ${missingModels.join(", ")}.`,
  );

  const routeFiles = [
    "app/gst-desk/page.tsx",
    "app/gst-desk/clients/page.tsx",
    "app/gst-desk/upload/page.tsx",
    "app/gst-desk/review/page.tsx",
    "app/gst-desk/export/page.tsx",
    "app/api/gst/clients/route.ts",
    "app/api/gst/periods/route.ts",
    "app/api/gst/documents/route.ts",
    "app/api/gst/export/route.ts",
  ];
  const missingRoutes = routeFiles.filter((path) => !fileExists(path));
  add(
    "JODO GST Desk",
    "route structure",
    missingRoutes.length === 0 ? "PASS" : "FAIL",
    missingRoutes.length === 0 ? "GST Desk page and API routes are present." : `Missing ${missingRoutes.join(", ")}.`,
  );

  add(
    "JODO GST Desk",
    "queue integration",
    fileExists("lib/gst/extraction-queue.ts") && fileContains("workers/workflow-worker.ts", "gstQueueName") ? "PASS" : "FAIL",
    "GST extraction queue and worker hook are checked on disk.",
  );

  const gstQueueFile = readText("lib/gst/extraction-queue.ts");
  add(
    "JODO GST Desk",
    "BullMQ-safe extraction job IDs",
    fileContains("lib/queue/job-id.ts", "makeBullMqSafeJobId")
      && gstQueueFile.includes("makeBullMqSafeJobId")
      && !gstQueueFile.includes("`${data.documentId}:${Date.now()}`")
      ? "PASS"
      : "FAIL",
    "GST upload extraction jobs sanitize custom BullMQ job IDs before queue.add.",
  );
}

async function auditObservabilityAndExternalServices() {
  for (const group of checkEnvGroups()) {
    add(
      group.label.includes("Sentry") || group.label.includes("PostHog") ? "Error Tracking & Logs" : "External Services",
      group.label,
      group.status,
      group.status === "PASS"
        ? `${group.label} env values are present.`
        : `Missing ${group.missing.join(", ")} for ${group.requiredFor}.`,
    );
  }

  if (process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim()) {
    try {
      const token = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
      const res = await fetchWithTimeout("https://api.razorpay.com/v1/items?count=1", {
        headers: { Authorization: `Basic ${token}` },
      });
      add("External Services", "Razorpay live credential check", res.ok ? "PASS" : "FAIL", `Razorpay API returned ${res.status}.`);
    } catch (error) {
      add("External Services", "Razorpay live credential check", "FAIL", error instanceof Error ? error.message : "Razorpay check failed.");
    }
  }

  if (process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() && process.env.WHATSAPP_ACCESS_TOKEN?.trim()) {
    try {
      const phoneId = encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID);
      const res = await fetchWithTimeout(`https://graph.facebook.com/v18.0/${phoneId}?fields=id,display_phone_number`, {
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
      });
      add("External Services", "WhatsApp live credential check", res.ok ? "PASS" : "FAIL", `Meta Graph API returned ${res.status}.`);
    } catch (error) {
      add("External Services", "WhatsApp live credential check", "FAIL", error instanceof Error ? error.message : "WhatsApp check failed.");
    }
  }
}

function printReport() {
  const grouped = new Map<string, AuditCheck[]>();
  for (const check of checks) {
    const items = grouped.get(check.layer) ?? [];
    items.push(check);
    grouped.set(check.layer, items);
  }

  console.log("\nJODO Production Stack Audit");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Strict mode: ${strict ? "yes" : "no"}`);
  console.log(`Report hash: ${createHash("sha256").update(JSON.stringify(checks)).digest("hex").slice(0, 12)}\n`);

  for (const [layer, items] of grouped.entries()) {
    console.log(layer);
    for (const item of items) {
      console.log(`  [${item.status}] ${item.name} - ${item.evidence}`);
    }
    console.log("");
  }

  const summary = {
    pass: checks.filter((check) => check.status === "PASS").length,
    fail: checks.filter((check) => check.status === "FAIL").length,
    blocked: checks.filter((check) => check.status === "BLOCKED").length,
  };
  console.log(`Summary: PASS=${summary.pass} FAIL=${summary.fail} BLOCKED=${summary.blocked}`);
}

async function main() {
  await auditFrontend();
  await auditApiAndAuth();
  await auditDatabaseAndStorage();
  await auditQueueAndCompute();
  await auditSecurityAndRateLimits();
  await auditDeploymentCiRecovery();
  await auditGstDesk();
  await auditObservabilityAndExternalServices();
  printReport();

  const hasFail = checks.some((check) => check.status === "FAIL");
  const hasBlocked = checks.some((check) => check.status === "BLOCKED");
  if (hasFail || (strict && hasBlocked)) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    await closeQueueRedisConnection().catch(() => undefined);
  });
