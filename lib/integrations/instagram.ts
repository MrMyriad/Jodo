import axios from "axios";

export type InstagramCredentials = {
  accessToken: string;
  igAccountId: string;
};

export async function testInstagramCredentials(
  credentials: InstagramCredentials,
) {
  const response = await axios.get(
    `https://graph.facebook.com/v18.0/${credentials.igAccountId}`,
    {
      params: { fields: "id,username", access_token: credentials.accessToken },
      timeout: 15000,
    },
  );

  const data = response.data as unknown as { id?: string; username?: string };
  if (!data?.id) {
    throw new Error(
      "Instagram verification failed: could not load IG account.",
    );
  }

  return {
    ok: true,
    igAccount: { id: data.id, username: data.username ?? null },
  };
}

export async function replyToInstagramMessage(input: {
  credentials: InstagramCredentials;
  recipientId: string;
  message: string;
}) {
  // Note: Instagram messaging permissions must be granted in Meta app.
  const response = await axios.post(
    `https://graph.facebook.com/v18.0/${input.credentials.igAccountId}/messages`,
    {
      recipient: { id: input.recipientId },
      message: { text: input.message },
    },
    {
      params: { access_token: input.credentials.accessToken },
      timeout: 15000,
    },
  );

  return response.data;
}
