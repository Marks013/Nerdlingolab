"use server";

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface NewsletterState {
  message: string | null;
  ok: boolean;
}

const newsletterSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").max(160)
});

export async function subscribeNewsletter(
  _previousState: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  const parsedInput = newsletterSchema.safeParse({
    email: formData.get("email")
  });

  if (!parsedInput.success) {
    return {
      message: parsedInput.error.issues[0]?.message ?? "Informe um e-mail válido.",
      ok: false
    };
  }

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email: parsedInput.data.email.toLowerCase() },
      create: {
        email: parsedInput.data.email.toLowerCase(),
        source: "footer"
      },
      update: {
        isActive: true,
        source: "footer"
      }
    });
  } catch (error) {
    Sentry.captureException(error);

    return {
      message: "Não foi possível confirmar sua inscrição agora. Tente novamente em instantes.",
      ok: false
    };
  }

  return {
    message: "Inscrição confirmada.",
    ok: true
  };
}

export async function setNewsletterSubscriberStatus(subscriberId: string, isActive: boolean): Promise<void> {
  await requireAdmin();

  try {
    await prisma.newsletterSubscriber.update({
      where: { id: subscriberId },
      data: { isActive }
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível atualizar o inscrito da newsletter.");
  }

  revalidatePath("/admin/newsletter");
  revalidatePath("/admin/dashboard");
}
