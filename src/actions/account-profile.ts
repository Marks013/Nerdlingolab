"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { customerProfileSchema } from "@/lib/account/profile-schema";
import { sanitizeCustomerNextPath } from "@/lib/account/completion";
import { auth } from "@/lib/auth";
import { getCpfLookupValues, parseBirthdayInput } from "@/lib/identity/brazil";
import { ensureReferralCode } from "@/lib/loyalty/referrals";
import { getLoyaltyProgramSettings, getPointsExpirationDate } from "@/lib/loyalty/settings";
import { prisma } from "@/lib/prisma";
import { LoyaltyLedgerType } from "@/generated/prisma/client";
import { z } from "zod";

const completeCustomerRegistrationSchema = customerProfileSchema.extend({
  acceptPrivacy: z.literal(true),
  acceptTerms: z.literal(true),
  nextPath: z.string().trim().max(300).optional()
});

export async function updateCustomerProfile(formData: FormData): Promise<void> {
  const userId = await requireCurrentUserId();
  const parsedProfile = customerProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    cpf: formData.get("cpf"),
    birthday: formData.get("birthday")
  });

  if (!parsedProfile.success) {
    throw new Error("Revise os dados pessoais informados.");
  }

  try {
    const cpfOwner = await prisma.user.findFirst({
      where: {
        cpf: { in: getCpfLookupValues(parsedProfile.data.cpf) },
        NOT: { id: userId }
      },
      select: { id: true }
    });

    if (cpfOwner) {
      throw new Error("CPF já vinculado a outra conta.");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: parsedProfile.data.name,
        phone: parsedProfile.data.phone,
        cpf: parsedProfile.data.cpf,
        birthday: parseBirthdayInput(parsedProfile.data.birthday)
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    if (error instanceof Error && error.message === "CPF já vinculado a outra conta.") {
      throw error;
    }
    throw new Error("Não foi possível salvar seus dados pessoais.");
  }

  revalidatePath("/conta");
  revalidatePath("/checkout");
  redirect("/conta");
}

export async function completeCustomerRegistration(formData: FormData): Promise<void> {
  const userId = await requireCurrentUserId();
  const parsedProfile = completeCustomerRegistrationSchema.safeParse({
    acceptPrivacy: formData.get("acceptPrivacy") === "on",
    acceptTerms: formData.get("acceptTerms") === "on",
    birthday: formData.get("birthday"),
    cpf: formData.get("cpf"),
    name: formData.get("name"),
    nextPath: formData.get("nextPath") || undefined,
    phone: formData.get("phone")
  });

  if (!parsedProfile.success) {
    redirect("/cadastro/google?error=invalid");
  }

  const nextPath = sanitizeCustomerNextPath(parsedProfile.data.nextPath);
  const cpfOwner = await prisma.user.findFirst({
    where: {
      cpf: { in: getCpfLookupValues(parsedProfile.data.cpf) },
      NOT: { id: userId }
    },
    select: { id: true }
  });

  if (cpfOwner) {
    redirect("/cadastro/google?error=cpf");
  }

  try {
    const loyaltySettings = await getLoyaltyProgramSettings();
    const signupBonusPoints = loyaltySettings.isEnabled ? loyaltySettings.signupBonusPoints : 0;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          birthday: parseBirthdayInput(parsedProfile.data.birthday),
          cpf: parsedProfile.data.cpf,
          name: parsedProfile.data.name,
          phone: parsedProfile.data.phone,
          privacyAcceptedAt: new Date(),
          termsAcceptedAt: new Date()
        }
      });

      const existingLoyaltyPoints = await tx.loyaltyPoints.findUnique({
        where: { userId },
        select: { id: true }
      });

      if (!existingLoyaltyPoints) {
        await tx.loyaltyPoints.create({
          data: {
            balance: signupBonusPoints,
            lifetimeEarned: signupBonusPoints,
            userId
          }
        });

        if (signupBonusPoints > 0) {
          await tx.loyaltyLedger.create({
            data: {
              balanceAfter: signupBonusPoints,
              customerNote: "Bonus de boas-vindas",
              expiresAt: getPointsExpirationDate(loyaltySettings),
              idempotencyKey: `loyalty:signup:${userId}`,
              pointsDelta: signupBonusPoints,
              reason: "Bonus de cadastro",
              type: LoyaltyLedgerType.EARN,
              userId
            }
          });
        }
      }

      await ensureReferralCode(userId, tx);
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Nao foi possivel finalizar seu cadastro.");
  }

  revalidatePath("/conta");
  revalidatePath("/checkout");
  redirect(nextPath);
}

async function requireCurrentUserId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  return session.user.id;
}
