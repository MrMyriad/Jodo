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
    const url = new URL("/auth/signin", getAppBaseUrl());
    return NextResponse.redirect(url);
  }

  const clientId = process.env.META_APP_ID?.trim();
  if (!clientId) {
    const url = new URL("/integrations/instagram/connect?error=missing_meta_app_id", getAppBaseUrl());
    return NextResponse.redirect(url);
  }

  const redirectUri = `${getAppBaseUrl()}/api/integrations/instagram/oauth/callback`;
  const state = crypto.randomBytes(24).toString("hex");
  const scope =
    process.env.META_OAUTH_SCOPES?.trim() ||
    "pages_show_list,pages_manage_metadata,pages_read_engagement,instagram_manage_messages";

  const authUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
