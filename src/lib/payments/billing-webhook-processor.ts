import * as Sentry from "@sentry/nextjs";

import { WebhookProvider, WebhookStatus } from "@/generated/prisma/client";
import {
  isRecoverableMercadoPagoPaymentError,
  processMercadoPagoPayment,
} from "@/lib/payments/mercadopago-webhook";
import { getMercadoPagoPaymentId } from "@/lib/payments/mercadopago-webhook-payload";
import { prisma } from "@/lib/prisma";

const defaultStaleProcessingMinutes = 15;
const defaultMaxAttempts = 6;
const baseBackoffMs = 60_000;
const maxBackoffMs = 60 * 60_000;

const finalWebhookStatuses = new Set<WebhookStatus>([
  WebhookStatus.DEAD_LETTER,
  WebhookStatus.IGNORED,
  WebhookStatus.PROCESSED
]);

type BillingWebhookProcessorStatus =
  | "busy"
  | "dead_letter"
  | "ignored"
  | "not_found"
  | "processed"
  | "scheduled_retry"
  | "skipped"
  | "waiting";

export interface BillingWebhookProcessorResult {
  attempts?: number;
  errorMessage?: string | null;
  nextRetryAt?: string | null;
  status: BillingWebhookProcessorStatus;
  webhookEventId: string;
}

export interface BillingWebhookBatchResult {
  attempted: number;
  busy: number;
  deadLetter: number;
  ignored: number;
  processed: number;
  scheduledRetry: number;
  skipped: number;
  waiting: number;
}

export async function runBillingWebhookProcessor(limit = 50): Promise<BillingWebhookBatchResult> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - getStaleProcessingMs());
  const events = await prisma.webhookEvent.findMany({
    orderBy: [
      { nextRetryAt: "asc" },
      { createdAt: "asc" }
    ],
    select: { id: true },
    take: limit,
    where: {
      provider: WebhookProvider.MERCADO_PAGO,
      OR: [
        { status: WebhookStatus.RECEIVED },
        {
          status: WebhookStatus.FAILED,
          OR: [
            { nextRetryAt: null },
            { nextRetryAt: { lte: now } }
          ]
        },
        {
          status: WebhookStatus.PROCESSING,
          OR: [
            { processingStartedAt: null },
            { processingStartedAt: { lte: staleBefore } }
          ]
        }
      ]
    }
  });

  const batch: BillingWebhookBatchResult = {
    attempted: events.length,
    busy: 0,
    deadLetter: 0,
    ignored: 0,
    processed: 0,
    scheduledRetry: 0,
    skipped: 0,
    waiting: 0
  };

  for (const event of events) {
    const result = await processBillingWebhookEvent(event.id, now);

    if (result.status === "processed") {
      batch.processed += 1;
    } else if (result.status === "ignored") {
      batch.ignored += 1;
    } else if (result.status === "scheduled_retry") {
      batch.scheduledRetry += 1;
    } else if (result.status === "dead_letter") {
      batch.deadLetter += 1;
    } else if (result.status === "busy") {
      batch.busy += 1;
    } else if (result.status === "waiting") {
      batch.waiting += 1;
    } else {
      batch.skipped += 1;
    }
  }

  return batch;
}

export async function processBillingWebhookEvent(
  webhookEventId: string,
  now = new Date()
): Promise<BillingWebhookProcessorResult> {
  const claimed = await claimWebhookEvent(webhookEventId, now);

  if (!claimed.event) {
    return {
      status: claimed.status,
      webhookEventId
    };
  }

  const paymentId = getMercadoPagoPaymentId(claimed.event.payload);

  if (!paymentId) {
    return markWebhookIgnored(claimed.event.id, "Payment id ausente no payload.");
  }

  try {
    await processMercadoPagoPayment({
      paymentId,
      webhookEventId: claimed.event.id
    });

    return normalizePostProcessingStatus(claimed.event.id, claimed.event.attempts);
  } catch (error) {
    if (isMercadoPagoPaymentNotFoundError(error)) {
      return markWebhookIgnored(claimed.event.id, "Payment not found no Mercado Pago.");
    }

    if (isRecoverableMercadoPagoPaymentError(error)) {
      return scheduleRetryOrDeadLetter(claimed.event.id, claimed.event.attempts, claimed.event.maxAttempts, error);
    }

    Sentry.captureException(error, {
      tags: {
        feature: "billing-webhook-processor",
        webhookEventId: claimed.event.id
      }
    });

    return scheduleRetryOrDeadLetter(claimed.event.id, claimed.event.attempts, claimed.event.maxAttempts, error);
  }
}

async function claimWebhookEvent(
  webhookEventId: string,
  now: Date
): Promise<{
  event?: {
    attempts: number;
    id: string;
    maxAttempts: number;
    payload: unknown;
  };
  status: BillingWebhookProcessorStatus;
}> {
  const event = await prisma.webhookEvent.findUnique({
    select: {
      attempts: true,
      id: true,
      maxAttempts: true,
      nextRetryAt: true,
      processingStartedAt: true,
      status: true
    },
    where: { id: webhookEventId }
  });

  if (!event) {
    return { status: "not_found" };
  }

  if (finalWebhookStatuses.has(event.status)) {
    return { status: "skipped" };
  }

  const maxAttempts = normalizeMaxAttempts(event.maxAttempts);

  if (event.attempts >= maxAttempts) {
    await markWebhookDeadLetter(event.id, event.attempts, "Limite de tentativas atingido antes de nova execucao.");
    return { status: "dead_letter" };
  }

  if (event.status === WebhookStatus.PROCESSING && !isProcessingStale(event.processingStartedAt, now)) {
    return { status: "busy" };
  }

  if (event.status === WebhookStatus.FAILED && event.nextRetryAt && event.nextRetryAt > now) {
    return { status: "waiting" };
  }

  const staleBefore = new Date(now.getTime() - getStaleProcessingMs());
  const claim = await prisma.webhookEvent.updateMany({
    data: {
      attempts: { increment: 1 },
      errorMessage: null,
      lastAttemptAt: now,
      processingStartedAt: now,
      status: WebhookStatus.PROCESSING
    },
    where: {
      id: event.id,
      OR: [
        { status: WebhookStatus.RECEIVED },
        {
          status: WebhookStatus.FAILED,
          OR: [
            { nextRetryAt: null },
            { nextRetryAt: { lte: now } }
          ]
        },
        {
          status: WebhookStatus.PROCESSING,
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

  const claimed = await prisma.webhookEvent.findUniqueOrThrow({
    select: {
      attempts: true,
      id: true,
      maxAttempts: true,
      payload: true
    },
    where: { id: event.id }
  });

  return {
    event: claimed,
    status: "busy"
  };
}

async function normalizePostProcessingStatus(
  webhookEventId: string,
  attempts: number
): Promise<BillingWebhookProcessorResult> {
  const event = await prisma.webhookEvent.findUniqueOrThrow({
    select: {
      attempts: true,
      errorMessage: true,
      maxAttempts: true,
      nextRetryAt: true,
      status: true
    },
    where: { id: webhookEventId }
  });

  if (event.status === WebhookStatus.PROCESSED) {
    return { attempts: event.attempts, status: "processed", webhookEventId };
  }

  if (event.status === WebhookStatus.IGNORED) {
    return { attempts: event.attempts, errorMessage: event.errorMessage, status: "ignored", webhookEventId };
  }

  if (event.status === WebhookStatus.DEAD_LETTER) {
    return { attempts: event.attempts, errorMessage: event.errorMessage, status: "dead_letter", webhookEventId };
  }

  return scheduleRetryOrDeadLetter(
    webhookEventId,
    event.attempts || attempts,
    event.maxAttempts,
    event.errorMessage ?? "Processamento terminou sem status final."
  );
}

async function scheduleRetryOrDeadLetter(
  webhookEventId: string,
  attempts: number,
  maxAttempts: number,
  error: unknown
): Promise<BillingWebhookProcessorResult> {
  const errorMessage = normalizeErrorMessage(error);

  const safeMaxAttempts = normalizeMaxAttempts(maxAttempts);

  if (attempts >= safeMaxAttempts) {
    return markWebhookDeadLetter(webhookEventId, attempts, errorMessage);
  }

  const nextRetryAt = new Date(Date.now() + calculateBackoffMs(attempts));
  await prisma.webhookEvent.update({
    data: {
      errorMessage,
      nextRetryAt,
      processedAt: null,
      processingStartedAt: null,
      status: WebhookStatus.FAILED
    },
    where: { id: webhookEventId }
  });

  return {
    attempts,
    errorMessage,
    nextRetryAt: nextRetryAt.toISOString(),
    status: "scheduled_retry",
    webhookEventId
  };
}

async function markWebhookIgnored(
  webhookEventId: string,
  message: string
): Promise<BillingWebhookProcessorResult> {
  const event = await prisma.webhookEvent.update({
    data: {
      errorMessage: message,
      nextRetryAt: null,
      processedAt: new Date(),
      processingStartedAt: null,
      status: WebhookStatus.IGNORED
    },
    select: { attempts: true, errorMessage: true },
    where: { id: webhookEventId }
  });

  return {
    attempts: event.attempts,
    errorMessage: event.errorMessage,
    status: "ignored",
    webhookEventId
  };
}

async function markWebhookDeadLetter(
  webhookEventId: string,
  attempts: number,
  message: string
): Promise<BillingWebhookProcessorResult> {
  await prisma.webhookEvent.update({
    data: {
      errorMessage: message,
      nextRetryAt: null,
      processedAt: new Date(),
      processingStartedAt: null,
      status: WebhookStatus.DEAD_LETTER
    },
    where: { id: webhookEventId }
  });

  return {
    attempts,
    errorMessage: message,
    status: "dead_letter",
    webhookEventId
  };
}

function isProcessingStale(startedAt: Date | null, now: Date): boolean {
  return !startedAt || now.getTime() - startedAt.getTime() >= getStaleProcessingMs();
}

function calculateBackoffMs(attempts: number): number {
  const exponent = Math.max(0, attempts - 1);
  return Math.min(maxBackoffMs, baseBackoffMs * (2 ** exponent));
}

function getStaleProcessingMs(): number {
  const minutes = Number.parseInt(process.env.BILLING_WEBHOOK_STALE_AFTER_MINUTES ?? "", 10);
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

  return "Erro desconhecido no processamento do webhook.";
}

function isMercadoPagoPaymentNotFoundError(error: unknown): boolean {
  const text = collectErrorText(error).toLowerCase();

  return text.includes("payment not found")
    || text.includes("payment_not_found")
    || (text.includes("not_found") && text.includes("payment"))
    || (text.includes("resource not found") && text.includes("payment"));
}

function collectErrorText(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return `${value.name} ${value.message} ${collectErrorText((value as Error & { cause?: unknown }).cause)}`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [
      record.message,
      record.error,
      record.errorMessage,
      record.status,
      record.cause
    ].map(collectErrorText).join(" ");
  }

  return String(value);
}
