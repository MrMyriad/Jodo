type WhatsAppConfig = {
  phoneNumberId: string;
  accessToken: string;
};

export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  to: string,
  message: string,
) {
  const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`WhatsApp send failed (${response.status}): ${details}`);
  }

  return response.json();
}
