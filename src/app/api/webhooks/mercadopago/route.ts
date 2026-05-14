import { WebhookProvider, WebhookStatus } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { processBillingWebhookEvent } from "@/lib/payments/billing-webhook-processor";
import {
  getMercadoPagoExternalEventId,
  toJsonValue
} from "@/lib/payments/mercadopago-webhook-payload";
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
    const webhookEvent = await prisma.webhookEvent.upsert({
      where: {
        provider_externalEventId: webhookEventKey
      },
      create: {
        provider: WebhookProvider.MERCADO_PAGO,
        externalEventId,
        payload: jsonPayload
      },
      update: {
        payload: jsonPayload
      }
    });

    if (webhookEvent.status === WebhookStatus.PROCESSED) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (webhookEvent.status === WebhookStatus.DEAD_LETTER) {
      return NextResponse.json({ received: true, deadLetter: true });
    }

    if (webhookEvent.status === WebhookStatus.FAILED) {
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          nextRetryAt: new Date()
        }
      });
    }

    const processingResult = await processBillingWebhookEvent(webhookEvent.id);

    return NextResponse.json({ received: true, processing: processingResult.status });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json({ received: false }, { status: 500 });
  }
}

function getExternalEventId(payload: unknown): string {
  return getMercadoPagoExternalEventId(payload);
}
