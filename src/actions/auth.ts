"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { LoyaltyLedgerType, UserRole } from "@/generated/prisma/client";

import { signIn, signOut } from "@/lib/auth";
import { getLoyaltyProgramSettings, getPointsExpirationDate } from "@/lib/loyalty/settings";
import { ensureReferralCode, normalizeReferralCode } from "@/lib/loyalty/referrals";
import { prisma } from "@/lib/prisma";
import { isRateLimitedKey } from "@/lib/security/rate-limit";

export async function signInWithCredentials(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 120) ?? "unknown";
  const loginKey = `admin-login:${forwardedFor ?? realIp ?? "local"}:${userAgent}:${email.toLowerCase()}`;

  if (
    isRateLimitedKey(loginKey, {
      intervalMs: 15 * 60 * 1000,
      limit: 8,
      name: "admin-login"
    })
  ) {
    redirect("/admin/login?error=too_many_attempts");
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/admin/dashboard"
  });
}

export async function signInCustomerWithCredentials(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/conta"
  });
}

export async function registerCustomer(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const cpf = String(formData.get("cpf") ?? "").trim() || null;
  const referralCode = normalizeReferralCode(String(formData.get("referralCode") ?? ""));

  if (!name || !email || password.length < 8) {
    redirect("/cadastro?error=invalid");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    redirect("/cadastro?error=exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const loyaltySettings = await getLoyaltyProgramSettings();
  const signupBonusPoints = loyaltySettings.isEnabled ? loyaltySettings.signupBonusPoints : 0;
  const inviteeReferralBonusPoints = loyaltySettings.isEnabled && referralCode
    ? loyaltySettings.referralInviteeBonusPoints
    : 0;
  const initialBalance = signupBonusPoints + inviteeReferralBonusPoints;

  await prisma.$transaction(async (tx) => {
    const inviterCode = referralCode
      ? await tx.referralCode.findFirst({
          select: { code: true, userId: true },
          where: { code: referralCode, isActive: true }
        })
      : null;
    const user = await tx.user.create({
      data: {
        cpf,
        email,
        name,
        passwordHash,
        phone,
        role: UserRole.CUSTOMER,
        loyaltyPoints: {
          create: {
            balance: initialBalance,
            lifetimeEarned: initialBalance
          }
        }
      }
    });
    await ensureReferralCode(user.id, tx);

    if (signupBonusPoints > 0) {
      await tx.loyaltyLedger.create({
        data: {
          balanceAfter: signupBonusPoints,
          customerNote: "Bônus de boas-vindas",
          expiresAt: getPointsExpirationDate(loyaltySettings),
          idempotencyKey: `loyalty:signup:${user.id}`,
          pointsDelta: signupBonusPoints,
          reason: "Bônus de cadastro",
          type: LoyaltyLedgerType.EARN,
          userId: user.id
        }
      });
    }

    if (inviterCode && inviterCode.userId !== user.id) {
      await tx.referral.create({
        data: {
          inviteeId: user.id,
          inviteeRewardPoints: inviteeReferralBonusPoints,
          inviterId: inviterCode.userId,
          inviterRewardPoints: loyaltySettings.referralInviterBonusPoints,
          referralCode: inviterCode.code
        }
      });

      if (inviteeReferralBonusPoints > 0) {
        await tx.loyaltyLedger.create({
          data: {
            balanceAfter: initialBalance,
            customerNote: "Bônus por cadastro indicado",
            expiresAt: getPointsExpirationDate(loyaltySettings),
            idempotencyKey: `loyalty:referral:invitee:${user.id}`,
            pointsDelta: inviteeReferralBonusPoints,
            reason: "Bônus de indicação recebida",
            type: LoyaltyLedgerType.EARN,
            userId: user.id
          }
        });
      }
    }
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/conta"
  });
}

export async function signOutFromAdmin(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
