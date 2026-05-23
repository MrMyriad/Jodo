import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin", getAppBaseUrl()));
  }

  const clientId = process.env.ZOHO_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/integrations/zoho/connect?error=missing_zoho_client_id", getAppBaseUrl()),
    );
  }

  const accountsUrl =
    process.env.ZOHO_ACCOUNTS_URL?.trim() || "https://accounts.zoho.in";
  const redirectUri = `${getAppBaseUrl()}/api/integrations/zoho/oauth/callback`;
  const scope =
    process.env.ZOHO_BOOKS_SCOPE?.trim() ||
    "ZohoBooks.settings.READ,ZohoBooks.contacts.READ,ZohoBooks.invoices.CREATE,ZohoBooks.invoices.READ";
  const state = crypto.randomBytes(24).toString("hex");

  const authUrl = new URL("/oauth/v2/auth", accountsUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("zoho_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
