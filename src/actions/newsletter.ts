"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export interface NewsletterState {
  message: string | null;
  ok: boolean;
}

const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(160),
  website: z.string().trim().max(0).optional()
});

export async function subscribeNewsletter(
  _previousState: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  const parsedInput = newsletterSchema.safeParse({
    email: formData.get("email"),
    website: formData.get("website") ?? undefined
  });

  if (!parsedInput.success) {
    return {
      message: parsedInput.error.issues[0]?.message ?? "Informe um e-mail válido.",
      ok: false
    };
  }

  const email = parsedInput.data.email;

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: {
        email,
        source: "footer"
      },
      update: {
        isActive: true,
        source: "footer"
      }
    });
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        emailDomain: email.split("@")[1] ?? null,
        prismaCode: getPrismaErrorCode(error)
      },
      tags: {
        feature: "newsletter",
        operation: "subscribe"
      }
    });

    return {
      message: getNewsletterFailureMessage(error),
      ok: false
    };
  }

  revalidatePath("/admin/newsletter");
  revalidatePath("/admin/dashboard");

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
    Sentry.captureException(error, {
      extra: {
        subscriberId,
        prismaCode: getPrismaErrorCode(error)
      },
      tags: {
        feature: "newsletter",
        operation: "set-status"
      }
    });
    throw new Error("Não foi possível atualizar o inscrito da newsletter.");
  }

  revalidatePath("/admin/newsletter");
  revalidatePath("/admin/dashboard");
}

function getNewsletterFailureMessage(error: unknown): string {
  if (isMissingNewsletterStorage(error)) {
    return "A newsletter está aguardando atualização do banco. Tente novamente em instantes.";
  }

  return "Não foi possível confirmar sua inscrição agora. Tente novamente em instantes.";
}

function isMissingNewsletterStorage(error: unknown): boolean {
  const code = getPrismaErrorCode(error);
  const message = getErrorMessage(error);

  return (
    code === "P2021" ||
    code === "P2022" ||
    message.includes("NewsletterSubscriber") ||
    message.includes("newsletter_subscriber")
  );
}

function getPrismaErrorCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "";
}
