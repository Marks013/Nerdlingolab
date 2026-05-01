"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { CouponType, LoyaltyLedgerType, UserRole } from "@/generated/prisma/client";

import { signIn, signOut } from "@/lib/auth";
import { sanitizeAdminCallbackUrl } from "@/lib/admin";
import {
  getCpfLookupValues,
  isValidBirthdayInput,
  isValidCpf,
  normalizeCpf,
  normalizePhone,
  parseBirthdayInput
} from "@/lib/identity/brazil";
import { getLoyaltyProgramSettings, getPointsExpirationDate } from "@/lib/loyalty/settings";
import { ensureReferralCode, normalizeReferralCode } from "@/lib/loyalty/referrals";
import { sendPasswordResetEmail } from "@/lib/email/transactional";
import {
  createPasswordResetTokenForEmail,
  getRequestBaseUrl,
  resetPasswordWithToken
} from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { isRateLimitedKey } from "@/lib/security/rate-limit";

const credentialsFormSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128)
});

const adminCredentialsFormSchema = credentialsFormSchema.extend({
  callbackUrl: z.string().trim().max(300).optional()
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254)
});

const resetPasswordSchema = z.object({
  confirmPassword: z.string().min(8).max(128),
  password: z.string().min(8).max(128),
  token: z.string().min(32).max(256),
  userId: z.string().min(8).max(80)
}).refine((value) => value.password === value.confirmPassword, {
  message: "As senhas não conferem.",
  path: ["confirmPassword"]
});

const registerCustomerSchema = credentialsFormSchema.extend({
  acceptPrivacy: z.literal(true),
  acceptTerms: z.literal(true),
  birthday: z.string().trim().refine((value) => isValidBirthdayInput(value), "Data de nascimento inválida."),
  confirmPassword: z.string().min(8).max(128),
  cpf: z
    .string()
    .trim()
    .transform((value) => normalizeCpf(value))
    .refine((value) => isValidCpf(value), "CPF inválido."),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).regex(/^[0-9()+\-\s]*$/).optional().transform((value) => normalizePhone(value)),
  referralCode: z.string().trim().max(40).optional().transform((value) => normalizeReferralCode(value ?? ""))
}).refine((value) => value.password === value.confirmPassword, {
  message: "As senhas não conferem.",
  path: ["confirmPassword"]
});

export async function signInWithCredentials(formData: FormData): Promise<void> {
  const parsedCredentials = adminCredentialsFormSchema.safeParse({
    callbackUrl: formData.get("callbackUrl") || undefined,
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsedCredentials.success) {
    redirect("/admin/login?error=invalid");
  }

  await enforceFormRateLimit("admin-login", parsedCredentials.data.email, 8);

  const user = await validatePasswordCredentials(parsedCredentials.data.email, parsedCredentials.data.password);

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN)) {
    redirect("/admin/login?error=invalid");
  }

  await signIn("credentials", {
    email: parsedCredentials.data.email,
    password: parsedCredentials.data.password,
    redirectTo: sanitizeAdminCallbackUrl(parsedCredentials.data.callbackUrl)
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

  const user = await validatePasswordCredentials(parsedCredentials.data.email, parsedCredentials.data.password);

  if (!user) {
    redirect("/entrar?error=invalid");
  }

  await signIn("credentials", {
    email: parsedCredentials.data.email,
    password: parsedCredentials.data.password,
    redirectTo: user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN ? "/admin" : "/conta"
  });
}

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const parsedInput = forgotPasswordSchema.safeParse({
    email: formData.get("email")
  });

  if (!parsedInput.success) {
    redirect("/recuperar-senha?status=sent");
  }

  await enforceFormRateLimit("password-reset", parsedInput.data.email, 4);

  const resetToken = await createPasswordResetTokenForEmail(parsedInput.data.email);

  if (resetToken) {
    await sendPasswordResetEmail(resetToken, getRequestBaseUrl(await headers()));
  }

  redirect("/recuperar-senha?status=sent");
}

export async function resetCustomerPassword(formData: FormData): Promise<void> {
  const parsedInput = resetPasswordSchema.safeParse({
    confirmPassword: formData.get("confirmPassword"),
    password: formData.get("password"),
    token: formData.get("token"),
    userId: formData.get("userId")
  });

  if (!parsedInput.success) {
    redirect("/redefinir-senha?error=invalid");
  }

  await enforceFormRateLimit("password-reset-confirm", parsedInput.data.userId, 8);

  const didReset = await resetPasswordWithToken({
    password: parsedInput.data.password,
    token: parsedInput.data.token,
    userId: parsedInput.data.userId
  });

  if (!didReset) {
    redirect("/redefinir-senha?error=expired");
  }

  redirect("/entrar?reset=success");
}

export async function registerCustomer(formData: FormData): Promise<void> {
  const parsedCustomer = registerCustomerSchema.safeParse({
    acceptPrivacy: formData.get("acceptPrivacy") === "on",
    acceptTerms: formData.get("acceptTerms") === "on",
    birthday: formData.get("birthday"),
    confirmPassword: formData.get("confirmPassword"),
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

  const { birthday, cpf, email, name, password, phone, referralCode } = parsedCustomer.data;
  await enforceFormRateLimit("customer-register", email, 5);
  await enforceFormRateLimit("customer-register-cpf", cpf, 3);

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { cpf: { in: getCpfLookupValues(cpf) } }
      ]
    }
  });

  if (existingUser) {
    redirect("/cadastro?error=exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const loyaltySettings = await getLoyaltyProgramSettings();
  const signupBonusPoints = loyaltySettings.isEnabled ? loyaltySettings.signupBonusPoints : 0;
  const initialBalance = signupBonusPoints;

  await prisma.$transaction(async (tx) => {
    const inviterCode = referralCode
      ? await tx.referralCode.findFirst({
          select: {
            code: true,
            user: {
              select: {
                cpf: true,
                email: true,
                phone: true
              }
            },
            userId: true
          },
          where: { code: referralCode, isActive: true }
        })
      : null;
    const canRegisterReferral = Boolean(
      inviterCode &&
      inviterCode.user.cpf &&
      inviterCode.user.cpf !== cpf &&
      inviterCode.user.email !== email &&
      (!phone || !inviterCode.user.phone || inviterCode.user.phone !== phone)
    );

    const user = await tx.user.create({
      data: {
        birthday: parseBirthdayInput(birthday),
        cpf,
        email,
        name,
        passwordHash,
        privacyAcceptedAt: new Date(),
        phone,
        role: UserRole.CUSTOMER,
        termsAcceptedAt: new Date(),
        loyaltyPoints: {
          create: {
            balance: initialBalance,
            lifetimeEarned: initialBalance
          }
        }
      }
    });
    await ensureReferralCode(user.id, tx);
    await tx.coupon.create({
      data: {
        assignedUserId: user.id,
        code: `NERD10-${user.id.slice(-6).toUpperCase()}`,
        expiresAt: addDays(new Date(), 60),
        isPublic: false,
        minSubtotalCents: 1000,
        perCustomerLimit: 1,
        type: CouponType.FIXED_AMOUNT,
        value: 1000
      }
    });

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

    if (canRegisterReferral && inviterCode && inviterCode.userId !== user.id) {
      const inviteeBonusPoints = loyaltySettings.isEnabled ? loyaltySettings.referralInviteeBonusPoints : 0;

      await tx.referral.create({
        data: {
          inviteeId: user.id,
          inviteeRewardPoints: inviteeBonusPoints,
          inviterId: inviterCode.userId,
          inviterRewardPoints: loyaltySettings.referralInviterBonusPoints,
          referralCode: inviterCode.code
        }
      });

      if (inviteeBonusPoints > 0) {
        await tx.loyaltyPoints.update({
          where: { userId: user.id },
          data: {
            balance: { increment: inviteeBonusPoints },
            lifetimeEarned: { increment: inviteeBonusPoints }
          }
        });

        await tx.loyaltyLedger.create({
          data: {
            balanceAfter: signupBonusPoints + inviteeBonusPoints,
            customerNote: "Bonus por convite",
            expiresAt: getPointsExpirationDate(loyaltySettings),
            idempotencyKey: `loyalty:referral:invitee:${user.id}:${inviterCode.code}`,
            metadata: { referralCode: inviterCode.code },
            pointsDelta: inviteeBonusPoints,
            reason: "Bonus de cadastro por convite",
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

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

export async function signOutFromAdmin(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function signOutFromCustomer(): Promise<void> {
  await signOut({ redirectTo: "/" });
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
    redirect(
      name.startsWith("admin")
        ? "/admin/login?error=too_many_attempts"
        : name.includes("register")
          ? "/cadastro?error=too_many_attempts"
          : "/entrar?error=too_many_attempts"
    );
  }
}

async function validatePasswordCredentials(email: string, password: string): Promise<{ role: UserRole } | null> {
  const user = await prisma.user.findUnique({
    select: {
      passwordHash: true,
      role: true
    },
    where: { email }
  });

  if (!user?.passwordHash) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  return isPasswordValid ? { role: user.role } : null;
}
