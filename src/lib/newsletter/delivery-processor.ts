import * as Sentry from "@sentry/nextjs";

import { sendNewsletterCampaignEmail } from "@/lib/email/transactional";
import { prisma } from "@/lib/prisma";

const defaultStaleProcessingMinutes = 15;
const defaultMaxAttempts = 6;
const baseBackoffMs = 60_000;
const maxBackoffMs = 60 * 60_000;
const finalDeliveryStatuses = new Set(["DEAD_LETTER", "IGNORED", "SENT"]);

type NewsletterDeliveryStatus =
  | "busy"
  | "dead_letter"
  | "ignored"
  | "not_found"
  | "scheduled_retry"
  | "sent"
  | "skipped"
  | "waiting";

export interface NewsletterDeliveryBatchResult {
  attempted: number;
  busy: number;
  deadLetter: number;
  ignored: number;
  scheduledRetry: number;
  sent: number;
  skipped: number;
  waiting: number;
}

export async function runNewsletterDeliveryProcessor(limit = 50): Promise<NewsletterDeliveryBatchResult> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - getStaleProcessingMs());
  const deliveries = await prisma.newsletterCampaignDelivery.findMany({
    orderBy: [
      { nextRetryAt: "asc" },
      { createdAt: "asc" }
    ],
    select: { campaignId: true, id: true },
    take: limit,
    where: {
      OR: [
        { status: "PENDING" },
        {
          status: "FAILED",
          OR: [
            { nextRetryAt: null },
            { nextRetryAt: { lte: now } }
          ]
        },
        {
          status: "PROCESSING",
          OR: [
            { processingStartedAt: null },
            { processingStartedAt: { lte: staleBefore } }
          ]
        }
      ]
    }
  });

  const batch: NewsletterDeliveryBatchResult = {
    attempted: deliveries.length,
    busy: 0,
    deadLetter: 0,
    ignored: 0,
    scheduledRetry: 0,
    sent: 0,
    skipped: 0,
    waiting: 0
  };
  const campaignIds = new Set<string>();

  for (const delivery of deliveries) {
    campaignIds.add(delivery.campaignId);
    const result = await processNewsletterDelivery(delivery.id, now);

    if (result === "sent") {
      batch.sent += 1;
    } else if (result === "ignored") {
      batch.ignored += 1;
    } else if (result === "scheduled_retry") {
      batch.scheduledRetry += 1;
    } else if (result === "dead_letter") {
      batch.deadLetter += 1;
    } else if (result === "busy") {
      batch.busy += 1;
    } else if (result === "waiting") {
      batch.waiting += 1;
    } else {
      batch.skipped += 1;
    }
  }

  for (const campaignId of campaignIds) {
    await refreshNewsletterCampaignDeliveryStats(campaignId);
  }

  return batch;
}

export async function processNewsletterDelivery(
  deliveryId: string,
  now = new Date()
): Promise<NewsletterDeliveryStatus> {
  const delivery = await claimNewsletterDelivery(deliveryId, now);

  if (!delivery) {
    return "busy";
  }

  if ("status" in delivery) {
    return delivery.status;
  }

  if (!delivery.subscriber.isActive) {
    await markNewsletterDeliveryIgnored(delivery.id, "Inscrito inativo ou descadastrado.");
    return "ignored";
  }

  try {
    const result = await sendNewsletterCampaignEmail({
      body: delivery.campaign.body,
      ctaHref: delivery.campaign.ctaHref,
      ctaLabel: delivery.campaign.ctaLabel,
      deliveryId: delivery.id,
      email: delivery.email,
      eyebrow: delivery.campaign.eyebrow,
      previewText: delivery.campaign.previewText,
      subject: delivery.campaign.subject,
      unsubscribeToken: delivery.subscriber.unsubscribeToken
    });

    if (!result.ok) {
      return scheduleNewsletterRetryOrDeadLetter(delivery.id, delivery.attempts, delivery.maxAttempts, result.error ?? "Falha ao enviar newsletter.");
    }

    const sentAt = new Date();
    await prisma.$transaction([
      prisma.newsletterCampaignDelivery.update({
        data: {
          errorMessage: null,
          nextRetryAt: null,
          processingStartedAt: null,
          sentAt,
          status: "SENT"
        },
        where: { id: delivery.id }
      }),
      prisma.newsletterSubscriber.update({
        data: { lastSentAt: sentAt },
        where: { id: delivery.subscriberId }
      })
    ]);

    return "sent";
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: "newsletter-delivery-processor",
        newsletterDeliveryId: delivery.id
      }
    });

    return scheduleNewsletterRetryOrDeadLetter(delivery.id, delivery.attempts, delivery.maxAttempts, error);
  }
}

export async function refreshNewsletterCampaignDeliveryStats(campaignId: string): Promise<void> {
  const [sentCount, failedCount, pendingCount, processingCount, deadLetterCount, recipientCount] = await Promise.all([
    prisma.newsletterCampaignDelivery.count({ where: { campaignId, status: "SENT" } }),
    prisma.newsletterCampaignDelivery.count({ where: { campaignId, status: "FAILED" } }),
    prisma.newsletterCampaignDelivery.count({ where: { campaignId, status: "PENDING" } }),
    prisma.newsletterCampaignDelivery.count({ where: { campaignId, status: "PROCESSING" } }),
    prisma.newsletterCampaignDelivery.count({ where: { campaignId, status: "DEAD_LETTER" } }),
    prisma.newsletterCampaignDelivery.count({ where: { campaignId } })
  ]);
  const isDone = pendingCount === 0 && processingCount === 0;

  await prisma.newsletterCampaign.update({
    data: {
      failedCount: failedCount + deadLetterCount,
      recipientCount,
      sentAt: isDone && sentCount > 0 ? new Date() : undefined,
      sentCount,
      status: isDone
        ? (failedCount + deadLetterCount > 0 ? "SENT_WITH_ERRORS" : "SENT")
        : "SENDING"
    },
    where: { id: campaignId }
  });
}

async function claimNewsletterDelivery(
  deliveryId: string,
  now: Date
): Promise<(
  | {
      attempts: number;
      campaign: {
        body: string;
        ctaHref: string | null;
        ctaLabel: string | null;
        eyebrow: string | null;
        previewText: string | null;
        subject: string;
      };
      email: string;
      id: string;
      maxAttempts: number;
      subscriber: {
        isActive: boolean;
        unsubscribeToken: string;
      };
      subscriberId: string;
    }
  | { status: NewsletterDeliveryStatus }
)> {
  const delivery = await prisma.newsletterCampaignDelivery.findUnique({
    select: {
      attempts: true,
      id: true,
      maxAttempts: true,
      nextRetryAt: true,
      processingStartedAt: true,
      status: true
    },
    where: { id: deliveryId }
  });

  if (!delivery) {
    return { status: "not_found" };
  }

  if (finalDeliveryStatuses.has(delivery.status)) {
    return { status: "skipped" };
  }

  const maxAttempts = normalizeMaxAttempts(delivery.maxAttempts);

  if (delivery.attempts >= maxAttempts) {
    await markNewsletterDeliveryDeadLetter(delivery.id, "Limite de tentativas atingido antes de nova execucao.");
    return { status: "dead_letter" };
  }

  if (delivery.status === "PROCESSING" && !isProcessingStale(delivery.processingStartedAt, now)) {
    return { status: "busy" };
  }

  if (delivery.status === "FAILED" && delivery.nextRetryAt && delivery.nextRetryAt > now) {
    return { status: "waiting" };
  }

  const staleBefore = new Date(now.getTime() - getStaleProcessingMs());
  const claim = await prisma.newsletterCampaignDelivery.updateMany({
    data: {
      attempts: { increment: 1 },
      errorMessage: null,
      lastAttemptAt: now,
      processingStartedAt: now,
      status: "PROCESSING"
    },
    where: {
      id: delivery.id,
      OR: [
        { status: "PENDING" },
        {
          status: "FAILED",
          OR: [
            { nextRetryAt: null },
            { nextRetryAt: { lte: now } }
          ]
        },
        {
          status: "PROCESSING",
          OR: [
            { processingStartedAt: null },
            { processingStartedAt: { lte: staleBefore } }
          ]
        }
      ]
    }
  });

  if (claim.count !== 1) {
    return { status: "busy" };
  }

  return prisma.newsletterCampaignDelivery.findUniqueOrThrow({
    select: {
      attempts: true,
      campaign: {
        select: {
          body: true,
          ctaHref: true,
          ctaLabel: true,
          eyebrow: true,
          previewText: true,
          subject: true
        }
      },
      email: true,
      id: true,
      maxAttempts: true,
      subscriber: {
        select: {
          isActive: true,
          unsubscribeToken: true
        }
      },
      subscriberId: true
    },
    where: { id: delivery.id }
  });
}

async function scheduleNewsletterRetryOrDeadLetter(
  deliveryId: string,
  attempts: number,
  maxAttempts: number,
  error: unknown
): Promise<NewsletterDeliveryStatus> {
  const errorMessage = normalizeErrorMessage(error);

  if (attempts >= normalizeMaxAttempts(maxAttempts)) {
    await markNewsletterDeliveryDeadLetter(deliveryId, errorMessage);
    return "dead_letter";
  }

  await prisma.newsletterCampaignDelivery.update({
    data: {
      errorMessage,
      nextRetryAt: new Date(Date.now() + calculateBackoffMs(attempts)),
      processingStartedAt: null,
      status: "FAILED"
    },
    where: { id: deliveryId }
  });

  return "scheduled_retry";
}

async function markNewsletterDeliveryIgnored(deliveryId: string, message: string): Promise<void> {
  await prisma.newsletterCampaignDelivery.update({
    data: {
      errorMessage: message,
      nextRetryAt: null,
      processingStartedAt: null,
      status: "IGNORED"
    },
    where: { id: deliveryId }
  });
}

async function markNewsletterDeliveryDeadLetter(deliveryId: string, message: string): Promise<void> {
  await prisma.newsletterCampaignDelivery.update({
    data: {
      errorMessage: message,
      nextRetryAt: null,
      processingStartedAt: null,
      status: "DEAD_LETTER"
    },
    where: { id: deliveryId }
  });
}

function isProcessingStale(startedAt: Date | null, now: Date): boolean {
  return !startedAt || now.getTime() - startedAt.getTime() >= getStaleProcessingMs();
}

function calculateBackoffMs(attempts: number): number {
  const exponent = Math.max(0, attempts - 1);
  return Math.min(maxBackoffMs, baseBackoffMs * (2 ** exponent));
}

function getStaleProcessingMs(): number {
  const minutes = Number.parseInt(process.env.NEWSLETTER_DELIVERY_STALE_AFTER_MINUTES ?? "", 10);
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : defaultStaleProcessingMinutes;

  return safeMinutes * 60_000;
}

function normalizeMaxAttempts(maxAttempts: number): number {
  return maxAttempts > 0 ? maxAttempts : defaultMaxAttempts;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Erro desconhecido no envio da newsletter.";
}
