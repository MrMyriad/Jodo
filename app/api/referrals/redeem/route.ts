import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { redeemReferralCode } from "@/lib/referrals";

const redeemSchema = z.object({
  code: z.string().trim().min(3, "Referral code is required."),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!process.env.DATABASE_URL || session.user.id.startsWith("dev:")) {
    return NextResponse.json(
      {
        error: "Referral redemption requires a configured database account.",
      },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const result = await redeemReferralCode({
      referredUserId: session.user.id,
      referralCode: parsed.data.code,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          reason: result.reason,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      plan: "PRO",
      rewards: {
        referredUserTrialUntil: result.referredExpiry,
        referrerProUntil: result.referrerExpiry,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to redeem referral.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

