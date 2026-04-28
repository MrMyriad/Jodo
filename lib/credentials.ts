import crypto from "crypto";

const ENCRYPTION_PREFIX = "enc:v1";

function getKeyBuffer(): Buffer {
  const key = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY is not configured.");
  }

  const trimmed = key.trim();
  if (trimmed.length === 64 && /^[a-fA-F0-9]+$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const base64Buffer = Buffer.from(trimmed, "base64");
  if (base64Buffer.length === 32) {
    return base64Buffer;
  }

  throw new Error(
    "CREDENTIALS_ENCRYPTION_KEY must be 32-byte base64 or 64-char hex key.",
  );
}

type EncryptedPayload = {
  __encrypted: true;
  format: typeof ENCRYPTION_PREFIX;
  iv: string;
  tag: string;
  data: string;
};

type JsonObject = Record<string, unknown>;

function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.__encrypted === true &&
    candidate.format === ENCRYPTION_PREFIX &&
    typeof candidate.iv === "string" &&
    typeof candidate.tag === "string" &&
    typeof candidate.data === "string"
  );
}

export function encryptCredentials(credentials: JsonObject): EncryptedPayload {
  const key = getKeyBuffer();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify(credentials);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    __encrypted: true,
    format: ENCRYPTION_PREFIX,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function decryptCredentials(payload: unknown): JsonObject {
  if (!isEncryptedPayload(payload)) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return {};
    }

    return payload as JsonObject;
  }

  const key = getKeyBuffer();
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const encrypted = Buffer.from(payload.data, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  const parsed = JSON.parse(decrypted.toString("utf8"));

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  return parsed as JsonObject;
}
