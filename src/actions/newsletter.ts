"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import {
  refreshNewsletterCampaignDeliveryStats,
  runNewsletterDeliveryProcessor
} from "@/lib/newsletter/delivery-processor";
import { getNewsletterAudienceSubscribers, isNewsletterAudience } from "@/lib/newsletter/audience";
import { prisma } from "@/lib/prisma";

export interface NewsletterState {
  message: string | null;
  ok: boolean;
}

const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(160),
  website: z.string().trim().max(0).optional()
});

const campaignSchema = z.object({
  body: z.string().trim().min(20, "Escreva uma mensagem com pelo menos 20 caracteres.").max(4000),
  ctaHref: z.string().trim().max(240).optional(),
  ctaLabel: z.string().trim().max(40).optional(),
  eyebrow: z.string().trim().max(60).optional(),
  name: z.string().trim().min(3).max(80),
  previewText: z.string().trim().max(160).optional(),
  audience: z.string().trim().refine((value) => isNewsletterAudience(value), "Escolha um público válido."),
  sendNow: z.boolean(),
  subject: z.string().trim().min(5).max(120)
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
        source: "footer",
        unsubscribedAt: null
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

export async function createNewsletterCampaign(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsedCampaign = campaignSchema.safeParse({
    body: formData.get("body"),
    ctaHref: normalizeOptionalFormText(formData.get("ctaHref")),
    ctaLabel: normalizeOptionalFormText(formData.get("ctaLabel")),
    eyebrow: normalizeOptionalFormText(formData.get("eyebrow")),
    name: formData.get("name"),
    previewText: normalizeOptionalFormText(formData.get("previewText")),
    audience: formData.get("audience") || "ACTIVE_SUBSCRIBERS",
    sendNow: formData.get("sendNow") === "on",
    subject: formData.get("subject")
  });

  if (!parsedCampaign.success) {
    throw new Error(parsedCampaign.error.issues[0]?.message ?? "Revise a campanha da newsletter.");
  }

  const { sendNow, ...campaignData } = parsedCampaign.data;
  const campaign = await prisma.newsletterCampaign.create({
    data: {
      ...campaignData,
      ctaHref: campaignData.ctaHref || null,
      ctaLabel: campaignData.ctaLabel || null,
      eyebrow: campaignData.eyebrow || null,
      previewText: campaignData.previewText || null,
      status: sendNow ? "SENDING" : "DRAFT"
    }
  });

  if (sendNow) {
    await sendNewsletterCampaign(campaign.id);
  }

  revalidatePath("/admin/newsletter");
}

export async function sendNewsletterCampaign(campaignId: string): Promise<void> {
  await requireAdmin();

  const campaign = await prisma.newsletterCampaign.findUnique({
    where: { id: campaignId }
  });

  if (!campaign) {
    throw new Error("Campanha não encontrada.");
  }

  if (campaign.status === "SENT") {
    throw new Error("Esta campanha já foi enviada.");
  }

  const subscribers = await getNewsletterAudienceSubscribers(campaign.audience);

  await prisma.newsletterCampaign.update({
    where: { id: campaign.id },
    data: {
      recipientCount: subscribers.length,
      status: "SENDING"
    }
  });

  for (const subscriber of subscribers) {
    await prisma.newsletterCampaignDelivery.upsert({
      where: {
        campaignId_subscriberId: {
          campaignId: campaign.id,
          subscriberId: subscriber.id
        }
      },
      create: {
        campaignId: campaign.id,
        email: subscriber.email,
        attempts: 0,
        errorMessage: null,
        nextRetryAt: null,
        processingStartedAt: null,
        status: "PENDING",
        subscriberId: subscriber.id
      },
      update: {
        attempts: 0,
        email: subscriber.email,
        errorMessage: null,
        nextRetryAt: null,
        processingStartedAt: null,
        status: "PENDING"
      }
    });
  }

  await runNewsletterDeliveryProcessor(Math.min(subscribers.length, 50));
  await refreshNewsletterCampaignDeliveryStats(campaign.id);

  revalidatePath("/admin/newsletter");
  revalidatePath("/admin/dashboard");
}

export async function unsubscribeNewsletterByToken(token: string): Promise<boolean> {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return false;
  }

  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { unsubscribeToken: normalizedToken }
  });

  if (!subscriber) {
    return false;
  }

  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      isActive: false,
      unsubscribedAt: new Date()
    }
  });
  revalidatePath("/admin/newsletter");
  revalidatePath("/admin/dashboard");

  return true;
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

function normalizeOptionalFormText(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";

  return text.length > 0 ? text : undefined;
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
