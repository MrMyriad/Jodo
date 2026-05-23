import { Resend } from "resend";

let cachedResendClient: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  if (!cachedResendClient) {
    cachedResendClient = new Resend(apiKey);
  }

  return cachedResendClient;
}

export function getEmailFromAddress(): string {
  const configuredFrom = process.env.RESEND_FROM_EMAIL?.trim();
  if (configuredFrom) {
    return configuredFrom;
  }

  const fallback = process.env.EMAIL_FROM?.trim();
  if (fallback) {
    return fallback;
  }

  return "JODO <noreply@jodo.in>";
}

