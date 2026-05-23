import axios from "axios";
import { isMockIntegrationModeEnabled } from "@/lib/integrations/mock-mode";

export type InstagramCredentials = {
  accessToken: string;
  igAccountId: string;
};

export async function testInstagramCredentials(
  credentials: InstagramCredentials,
) {
  if (isMockIntegrationModeEnabled()) {
    return {
      ok: true,
      igAccount: { id: credentials.igAccountId, username: "mock_ig_account" },
      mock: true,
    };
  }

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

export async function getRecentInstagramMessages(input: {
  credentials: InstagramCredentials;
  limit?: number;
}) {
  if (isMockIntegrationModeEnabled()) {
    return {
      data: [
        {
          conversationId: "mock_conv_1",
          senderId: "mock_sender_1",
          text: "Hi, price please",
          createdTime: new Date().toISOString(),
        },
      ],
      mock: true,
    };
  }

  const limit = Math.max(1, Math.min(50, input.limit ?? 5));
  const response = await axios.get(
    `https://graph.facebook.com/v18.0/${input.credentials.igAccountId}/conversations`,
    {
      params: {
        access_token: input.credentials.accessToken,
        fields: "messages{message,from,created_time}",
        limit,
      },
      timeout: 15000,
    },
  );

  const data = response.data as {
    data?: Array<{
      id?: string;
      messages?: {
        data?: Array<{
          message?: string;
          from?: { id?: string };
          created_time?: string;
        }>;
      };
    }>;
  };

  const flattened =
    data.data?.flatMap((conversation) =>
      (conversation.messages?.data ?? []).map((message) => ({
        conversationId: conversation.id ?? null,
        senderId: message.from?.id ?? null,
        text: message.message ?? "",
        createdTime: message.created_time ?? null,
      })),
    ) ?? [];

  return { data: flattened.slice(0, limit) };
}

export async function replyToInstagramMessage(input: {
  credentials: InstagramCredentials;
  recipientId: string;
  message: string;
}) {
  if (isMockIntegrationModeEnabled()) {
    return {
      mock: true,
      recipientId: input.recipientId,
      message: input.message,
      messageId: `ig_mock_${Date.now()}`,
    };
  }

  // Messaging on Instagram Business is routed through Graph messaging endpoint.
  const response = await axios.post(
    "https://graph.facebook.com/v18.0/me/messages",
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

