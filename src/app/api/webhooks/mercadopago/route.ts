import { WebhookProvider, WebhookStatus, type Prisma } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { processMercadoPagoPayment } from "@/lib/payments/mercadopago-webhook";
import { prisma } from "@/lib/prisma";
import { verifyMercadoPagoWebhookSignature } from "@/lib/security/mercadopago-signature";
import { rateLimitRequest } from "@/lib/security/rate-limit";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rateLimitError = rateLimitRequest(request, {
      intervalMs: 60_000,
      limit: 120,
      name: "mercadopago-webhook"
    });

    if (rateLimitError) {
      return rateLimitError;
    }

    const payload: unknown = await request.json();

    if (!verifyMercadoPagoWebhookSignature(request, payload)) {
      return NextResponse.json({ received: false }, { status: 401 });
    }

    const jsonPayload = toJsonValue(payload);
    const externalEventId = getExternalEventId(payload);

    const webhookEventKey = {
      provider: WebhookProvider.MERCADO_PAGO,
      externalEventId
    };
    const existingWebhookEvent = await prisma.webhookEvent.findUnique({
      where: {
        provider_externalEventId: webhookEventKey
      }
    });

    if (existingWebhookEvent?.status === WebhookStatus.PROCESSED) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const webhookEvent = existingWebhookEvent
      ? await prisma.webhookEvent.update({
          where: { id: existingWebhookEvent.id },
          data: { payload: jsonPayload }
        })
      : await prisma.webhookEvent.create({
          data: {
            provider: WebhookProvider.MERCADO_PAGO,
            externalEventId,
            payload: jsonPayload
          }
        });
    const paymentId = getPaymentId(payload);

    if (!paymentId) {
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: "IGNORED",
          errorMessage: "Payment id ausente no payload."
        }
      });

      return NextResponse.json({ received: true, ignored: true });
    }

    await processMercadoPagoPayment({
      paymentId,
      webhookEventId: webhookEvent.id
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json({ received: false }, { status: 500 });
  }
}

function getPaymentId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const data = typeof record.data === "object" && record.data !== null
    ? (record.data as Record<string, unknown>)
    : null;
  const candidate = data?.id ?? record["data.id"] ?? record.id;

  return typeof candidate === "string" || typeof candidate === "number"
    ? String(candidate)
    : null;
}

function toJsonValue(payload: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
}

function getExternalEventId(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    return crypto.randomUUID();
  }

  const record = payload as Record<string, unknown>;
  const data = typeof record.data === "object" && record.data !== null
    ? (record.data as Record<string, unknown>)
    : null;
  const id = record.id ?? record["data.id"] ?? data?.id;

  return typeof id === "string" || typeof id === "number" ? String(id) : crypto.randomUUID();
}
