import crypto from "crypto";

type RazorpayCredentials = {
  keyId: string;
  keySecret: string;
};

export async function createRazorpayWebhook(
  credentials: RazorpayCredentials,
  webhookUrl: string,
  events: string[] = [
    "payment.captured",
    "payment.failed",
    "invoice.paid",
    "refund.processed",
  ],
) {
  const { keyId, keySecret } = credentials;
  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials (keyId/keySecret) are required to create a webhook.",
    );
  }

  const secret = crypto.randomBytes(24).toString("hex");

  const body = {
    url: webhookUrl,
    events,
    secret,
  };

  const basic = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const res = await fetch("https://api.razorpay.com/v1/webhooks", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay webhook create failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return { webhook: data, secret };
}

export function verifyRazorpayWebhook(
  payload: string,
  signature: string,
  secret: string,
) {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch {
    return false;
  }
}
