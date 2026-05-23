import crypto from "crypto";
import { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const REFERRAL_CODE_LENGTH = 8;
const MAX_GENERATION_ATTEMPTS = 12;

function sanitizeReferralCode(code: string): string {
  return code.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function generateReferralCode(): string {
  // Base32-like uppercase code that is short but human-friendly.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let output = "";

  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    const index = crypto.randomInt(0, alphabet.length);
    output += alphabet[index];
  }

  return output;
}

function addDays(from: Date, days: number): Date {
  const value = new Date(from);
  value.setDate(value.getDate() + days);
  return value;
}

function addMonths(from: Date, months: number): Date {
  const value = new Date(from);
  value.setMonth(value.getMonth() + months);
  return value;
}

function getBaseExpiry(existing: Date | null | undefined): Date {
  const now = new Date();
  if (!existing) return now;
  return existing > now ? existing : now;
}

function upgradePlanIfNeeded(plan: Plan): Plan {
  if (plan === "BUSINESS") {
    return "BUSINESS";
  }
  return "PRO";
}

export function normalizeReferralCode(input: string): string {
  return sanitizeReferralCode(input);
}

export async function ensureUserReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.referralCode) {
    return user.referralCode;
  }

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const nextCode = generateReferralCode();

    const existing = await prisma.user.findUnique({
      where: { referralCode: nextCode },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { referralCode: nextCode },
      select: { referralCode: true },
    });

    if (updated.referralCode) {
      return updated.referralCode;
    }
  }

  throw new Error("Could not generate a unique referral code. Please retry.");
}

export async function redeemReferralCode(input: {
  referredUserId: string;
  referralCode: string;
}) {
  const normalizedCode = normalizeReferralCode(input.referralCode);
  if (!normalizedCode) {
    throw new Error("Referral code is required.");
  }

  return prisma.$transaction(async (tx) => {
    const referredUser = await tx.user.findUnique({
      where: { id: input.referredUserId },
      select: {
        id: true,
        plan: true,
        planExpiry: true,
        referredByCode: true,
      },
    });

    if (!referredUser) {
      throw new Error("User not found.");
    }

    if (referredUser.referredByCode) {
      return {
        ok: false as const,
        reason: "already_redeemed",
      };
    }

    const referrer = await tx.user.findUnique({
      where: { referralCode: normalizedCode },
      select: {
        id: true,
        plan: true,
        planExpiry: true,
        referralCode: true,
      },
    });

    if (!referrer || !referrer.referralCode) {
      return {
        ok: false as const,
        reason: "invalid_code",
      };
    }

    if (referrer.id === referredUser.id) {
      return {
        ok: false as const,
        reason: "self_referral_not_allowed",
      };
    }

    const referrerBase = getBaseExpiry(referrer.planExpiry);
    const referredBase = getBaseExpiry(referredUser.planExpiry);
    const referrerExpiry = addMonths(referrerBase, 1);
    const referredExpiry = addDays(referredBase, 14);

    await Promise.all([
      tx.user.update({
        where: { id: referrer.id },
        data: {
          plan: upgradePlanIfNeeded(referrer.plan),
          planExpiry: referrerExpiry,
        },
      }),
      tx.user.update({
        where: { id: referredUser.id },
        data: {
          referredByCode: referrer.referralCode,
          plan: upgradePlanIfNeeded(referredUser.plan),
          planExpiry: referredExpiry,
        },
      }),
    ]);

    return {
      ok: true as const,
      referrerId: referrer.id,
      referredUserId: referredUser.id,
      referrerExpiry,
      referredExpiry,
    };
  });
}

