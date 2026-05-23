import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { encryptConnectionCredentials } from "@/lib/connection-service";
import { prisma } from "@/lib/prisma";
import { toPrismaJson } from "@/lib/prisma-json";

type InstagramTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type MetaAccountResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    access_token?: string;
    instagram_business_account?: {
      id?: string;
      username?: string;
    };
  }>;
};

function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

function redirectToConnect(error?: string, connected?: boolean, name?: string) {
  const url = new URL("/integrations/instagram/connect", getAppBaseUrl());
  if (error) {
    url.searchParams.set("error", error);
  }
  if (connected) {
    url.searchParams.set("connected", "1");
  }
  if (name) {
    url.searchParams.set("name", name);
  }
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return redirectToConnect("unauthorized");
  }

  const reqUrl = new URL(req.url);
  const code = reqUrl.searchParams.get("code");
  const state = reqUrl.searchParams.get("state");
  const stateCookie = cookies().get("ig_oauth_state")?.value;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirectToConnect("invalid_state");
  }

  const clientId = process.env.META_APP_ID?.trim();
  const clientSecret = process.env.META_APP_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return redirectToConnect("missing_meta_credentials");
  }

  const redirectUri = `${getAppBaseUrl()}/api/integrations/instagram/oauth/callback`;

  try {
    const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("client_secret", clientSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString(), { cache: "no-store" });
    if (!tokenRes.ok) {
      return redirectToConnect("token_exchange_failed");
    }

    const tokenJson = (await tokenRes.json()) as InstagramTokenResponse;
    const userAccessToken = tokenJson.access_token;
    if (!userAccessToken) {
      return redirectToConnect("missing_access_token");
    }

    const accountsUrl = new URL("https://graph.facebook.com/v18.0/me/accounts");
    accountsUrl.searchParams.set(
      "fields",
      "name,access_token,instagram_business_account{id,username}",
    );
    accountsUrl.searchParams.set("access_token", userAccessToken);

    const accountsRes = await fetch(accountsUrl.toString(), { cache: "no-store" });
    if (!accountsRes.ok) {
      return redirectToConnect("accounts_fetch_failed");
    }

    const accounts = (await accountsRes.json()) as MetaAccountResponse;
    const pageWithIg = (accounts.data ?? []).find(
      (row) => row.instagram_business_account?.id && row.access_token,
    );

    if (!pageWithIg?.instagram_business_account?.id || !pageWithIg.access_token) {
      return redirectToConnect("no_instagram_business_account");
    }

    const integrationName =
      pageWithIg.instagram_business_account.username?.trim() ||
      pageWithIg.name?.trim() ||
      "Instagram Business";

    const encryptedCredentials = encryptConnectionCredentials({
      accessToken: pageWithIg.access_token,
      igAccountId: pageWithIg.instagram_business_account.id,
      pageId: pageWithIg.id ?? null,
      pageName: pageWithIg.name ?? null,
      username: pageWithIg.instagram_business_account.username ?? null,
    });

    const existing = await prisma.integration.findFirst({
      where: {
        userId: session.user.id,
        type: "INSTAGRAM",
        name: integrationName,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: {
          credentials: toPrismaJson(encryptedCredentials),
          isActive: true,
        },
      });
    } else {
      await prisma.integration.create({
        data: {
          userId: session.user.id,
          type: "INSTAGRAM",
          name: integrationName,
          credentials: toPrismaJson(encryptedCredentials),
          isActive: true,
        },
      });
    }

    const response = redirectToConnect(undefined, true, integrationName);
    response.cookies.set("ig_oauth_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch {
    return redirectToConnect("oauth_callback_failed");
  }
}
