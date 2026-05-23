import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureUserReferralCode } from "@/lib/referrals";

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!process.env.DATABASE_URL || session.user.id.startsWith("dev:")) {
    return NextResponse.json(
      {
        error: "Referral links require a configured database user account.",
      },
      { status: 400 },
    );
  }

  try {
    const referralCode = await ensureUserReferralCode(session.user.id);
    const referralLink = `${getBaseUrl()}?ref=${referralCode}`;

    return NextResponse.json({
      referralCode,
      referralLink,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get referral code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  // POST mirrors GET and can be used from clients that prefer explicit creation.
  return GET();
}

