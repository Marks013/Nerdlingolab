"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { LoyaltyLedgerType, UserRole } from "@/generated/prisma/client";

import { signIn, signOut } from "@/lib/auth";
import { getLoyaltyProgramSettings, getPointsExpirationDate } from "@/lib/loyalty/settings";
import { ensureReferralCode, normalizeReferralCode } from "@/lib/loyalty/referrals";
import { prisma } from "@/lib/prisma";
import { isRateLimitedKey } from "@/lib/security/rate-limit";

const credentialsFormSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128)
});

const registerCustomerSchema = credentialsFormSchema.extend({
  cpf: z.string().trim().max(20).regex(/^[0-9.-]*$/).optional().transform((value) => value || null),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).regex(/^[0-9()+\-\s]*$/).optional().transform((value) => value || null),
  referralCode: z.string().trim().max(40).optional().transform((value) => normalizeReferralCode(value ?? ""))
});

export async function signInWithCredentials(formData: FormData): Promise<void> {
  const parsedCredentials = credentialsFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsedCredentials.success) {
    redirect("/admin/login?error=invalid");
  }

  await enforceFormRateLimit("admin-login", parsedCredentials.data.email, 8);

  await signIn("credentials", {
    email: parsedCredentials.data.email,
    password: parsedCredentials.data.password,
    redirectTo: "/admin/dashboard"
  });
}

export async function signInCustomerWithCredentials(formData: FormData): Promise<void> {
  const parsedCredentials = credentialsFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsedCredentials.success) {
    redirect("/entrar?error=invalid");
  }

  await enforceFormRateLimit("customer-login", parsedCredentials.data.email, 10);

  await signIn("credentials", {
    email: parsedCredentials.data.email,
    password: parsedCredentials.data.password,
    redirectTo: "/conta"
  });
}

export async function registerCustomer(formData: FormData): Promise<void> {
  const parsedCustomer = registerCustomerSchema.safeParse({
    cpf: formData.get("cpf") || undefined,
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    phone: formData.get("phone") || undefined,
    referralCode: formData.get("referralCode") || undefined
  });

  if (!parsedCustomer.success) {
    redirect("/cadastro?error=invalid");
  }

  const { cpf, email, name, password, phone, referralCode } = parsedCustomer.data;
  await enforceFormRateLimit("customer-register", email, 5);

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        ...(cpf ? [{ cpf }] : [])
      ]
    }
  });

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
          customerNote: "Bonus de boas-vindas",
          expiresAt: getPointsExpirationDate(loyaltySettings),
          idempotencyKey: `loyalty:signup:${user.id}`,
          pointsDelta: signupBonusPoints,
          reason: "Bonus de cadastro",
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
            customerNote: "Bonus por cadastro indicado",
            expiresAt: getPointsExpirationDate(loyaltySettings),
            idempotencyKey: `loyalty:referral:invitee:${user.id}`,
            pointsDelta: inviteeReferralBonusPoints,
            reason: "Bonus de indicacao recebida",
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

async function enforceFormRateLimit(name: string, email: string, limit: number): Promise<void> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 120) ?? "unknown";
  const rateLimitKey = `${name}:${forwardedFor ?? realIp ?? "local"}:${userAgent}:${email}`;

  if (
    isRateLimitedKey(rateLimitKey, {
      intervalMs: 15 * 60 * 1000,
      limit,
      name
    })
  ) {
    redirect(name === "admin-login" ? "/admin/login?error=too_many_attempts" : "/entrar?error=too_many_attempts");
  }
}
