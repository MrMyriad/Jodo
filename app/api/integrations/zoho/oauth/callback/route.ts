import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { encryptConnectionCredentials } from "@/lib/connection-service";
import { prisma } from "@/lib/prisma";
import { toPrismaJson } from "@/lib/prisma-json";

type ZohoTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  api_domain?: string;
};

type ZohoOrganizationsResponse = {
  organizations?: Array<{
    organization_id?: string;
    name?: string;
    is_default_org?: boolean;
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
  const url = new URL("/integrations/zoho/connect", getAppBaseUrl());
  if (error) url.searchParams.set("error", error);
  if (connected) url.searchParams.set("connected", "1");
  if (name) url.searchParams.set("name", name);
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
  const stateCookie = cookies().get("zoho_oauth_state")?.value;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirectToConnect("invalid_state");
  }

  const clientId = process.env.ZOHO_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOHO_CLIENT_SECRET?.trim();
  const accountsUrl =
    process.env.ZOHO_ACCOUNTS_URL?.trim() || "https://accounts.zoho.in";

  if (!clientId || !clientSecret) {
    return redirectToConnect("missing_zoho_credentials");
  }

  const redirectUri = `${getAppBaseUrl()}/api/integrations/zoho/oauth/callback`;

  try {
    const tokenUrl = new URL("/oauth/v2/token", accountsUrl);
    tokenUrl.searchParams.set("grant_type", "authorization_code");
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("client_secret", clientSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString(), {
      method: "POST",
      cache: "no-store",
    });
    if (!tokenRes.ok) {
      return redirectToConnect("token_exchange_failed");
    }

    const tokenJson = (await tokenRes.json()) as ZohoTokenResponse;
    if (!tokenJson.access_token) {
      return redirectToConnect("missing_access_token");
    }

    const apiDomain = tokenJson.api_domain || "https://www.zohoapis.in";
    const orgRes = await fetch(`${apiDomain}/books/v3/organizations`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${tokenJson.access_token}`,
      },
      cache: "no-store",
    });

    if (!orgRes.ok) {
      return redirectToConnect("organizations_fetch_failed");
    }

    const orgJson = (await orgRes.json()) as ZohoOrganizationsResponse;
    const org =
      orgJson.organizations?.find((item) => item.is_default_org) ??
      orgJson.organizations?.[0];

    if (!org?.organization_id) {
      return redirectToConnect("organization_not_found");
    }

    const integrationName = org.name?.trim() || "Zoho Books";

    const encryptedCredentials = encryptConnectionCredentials({
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? null,
      organizationId: org.organization_id,
      apiDomain,
    });

    const existing = await prisma.integration.findFirst({
      where: {
        userId: session.user.id,
        type: "ZOHO_BOOKS",
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
          type: "ZOHO_BOOKS",
          name: integrationName,
          credentials: toPrismaJson(encryptedCredentials),
          isActive: true,
        },
      });
    }

    const response = redirectToConnect(undefined, true, integrationName);
    response.cookies.set("zoho_oauth_state", "", {
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
