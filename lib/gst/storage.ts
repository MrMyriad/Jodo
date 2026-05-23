import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type GstStorageStatus = {
  configured: boolean;
  bucket: string | null;
  missing: string[];
};

let supabaseAdmin: SupabaseClient | null = null;

export function getGstStorageStatus(): GstStorageStatus {
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET"].filter(
    (key) => !process.env[key]?.trim(),
  );

  return {
    configured: missing.length === 0,
    bucket: process.env.SUPABASE_STORAGE_BUCKET?.trim() || null,
    missing,
  };
}

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const status = getGstStorageStatus();
  if (!status.configured) {
    throw new Error(`Supabase Storage is not configured. Missing ${status.missing.join(", ")}.`);
  }

  supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  return supabaseAdmin;
}

function safeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "document";
}

export async function uploadGstDocumentFile(input: {
  userId: string;
  clientId: string;
  periodId: string;
  file: File;
}) {
  const status = getGstStorageStatus();
  if (!status.configured || !status.bucket) {
    return {
      ok: false as const,
      status,
      error: `Supabase Storage is blocked. Missing ${status.missing.join(", ")}.`,
    };
  }

  const storage = getSupabaseAdmin().storage.from(status.bucket);
  const originalName = input.file.name || "document";
  const storagePath = [
    "gst-desk",
    input.userId,
    input.clientId,
    input.periodId,
    `${Date.now()}-${crypto.randomUUID()}-${safeFileName(originalName)}`,
  ].join("/");

  const bytes = await input.file.arrayBuffer();
  const { error } = await storage.upload(storagePath, bytes, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    return { ok: false as const, status, error: error.message };
  }

  return {
    ok: true as const,
    bucket: status.bucket,
    path: storagePath,
    fileName: safeFileName(originalName),
  };
}
