import * as Sentry from "@sentry/nextjs";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { runDueOperationalJob } from "@/lib/automation/operational-scheduler";
import { syncDueProductSources } from "@/lib/dropshipping/sync";
import { runLoyaltyMarketingAutomation } from "@/lib/loyalty/automation";
import { runNewsletterDeliveryProcessor } from "@/lib/newsletter/delivery-processor";
import { runBillingWebhookProcessor } from "@/lib/payments/billing-webhook-processor";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";

export const dynamic = "force-dynamic";

const automationQuerySchema = z.object({
  billingLimit: z.coerce.number().int().min(1).max(200).default(50),
  dropshippingLimit: z.coerce.number().int().min(1).max(200).default(100),
  force: z
    .enum(["0", "1", "false", "true"])
    .optional()
    .transform((value) => value === "1" || value === "true"),
  newsletterLimit: z.coerce.number().int().min(1).max(200).default(50)
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimitError = rateLimitRequest(request, {
    intervalMs: 60_000,
    limit: 30,
    name: "cron-automation"
  });

  if (rateLimitError) {
    return rateLimitError;
  }

  const sameOriginError = hasBearerToken(request) ? null : assertSameOriginRequest(request);

  if (sameOriginError) {
    return sameOriginError;
  }

  const authResult = authorizeCronRequest(request);

  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const parsedQuery = automationQuerySchema.safeParse({
      billingLimit: request.nextUrl.searchParams.get("billingLimit") ?? undefined,
      dropshippingLimit: request.nextUrl.searchParams.get("dropshippingLimit") ?? undefined,
      force: request.nextUrl.searchParams.get("force") ?? undefined,
      newsletterLimit: request.nextUrl.searchParams.get("newsletterLimit") ?? undefined
    });

    if (!parsedQuery.success) {
      return NextResponse.json({ error: "Parametros invalidos." }, { status: 400 });
    }

    const input = parsedQuery.data;
    const results = [
      await runDueOperationalJob({
        force: true,
        jobKey: "billing-queue",
        minIntervalMs: 0,
        run: () => runBillingWebhookProcessor(input.billingLimit)
      }),
      await runDueOperationalJob({
        force: true,
        jobKey: "newsletter-queue",
        minIntervalMs: 0,
        run: () => runNewsletterDeliveryProcessor(input.newsletterLimit)
      }),
      await runDueOperationalJob({
        force: input.force,
        jobKey: "dropshipping-sync",
        minIntervalMs: minutesFromEnv("NERDLINGOLAB_DROPSHIPPING_MIN_INTERVAL_MINUTES", 24 * 60),
        run: () => syncDueProductSources(input.dropshippingLimit)
      }),
      await runDueOperationalJob({
        force: input.force,
        jobKey: "loyalty-marketing",
        minIntervalMs: minutesFromEnv("NERDLINGOLAB_MARKETING_MIN_INTERVAL_MINUTES", 24 * 60),
        run: () => runLoyaltyMarketingAutomation()
      })
    ];

    return NextResponse.json({
      ok: results.every((result) => result.state !== "failed"),
      results,
      ranAt: new Date().toISOString()
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: "automation-cron"
      }
    });

    return NextResponse.json({ error: "Falha ao executar automacao operacional." }, { status: 500 });
  }
}

function minutesFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed * 60_000 : fallback * 60_000;
}

function hasBearerToken(request: NextRequest): boolean {
  return request.headers.get("authorization")?.startsWith("Bearer ") ?? false;
}

function authorizeCronRequest(request: NextRequest): { error?: string; ok: boolean; status: number } {
  const expectedSecrets = [process.env.NERDLINGOLAB_AUTOMATION_SECRET].filter((value): value is string =>
    Boolean(value)
  );

  if (expectedSecrets.length === 0) {
    return { error: "Secret de automacao dedicado nao configurado.", ok: false, status: 503 };
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";

  if (!expectedSecrets.some((expectedSecret) => safeTokenEquals(token, expectedSecret))) {
    return { error: "Nao autorizado.", ok: false, status: 401 };
  }

  return { ok: true, status: 200 };
}

function safeTokenEquals(receivedToken: string, expectedToken: string): boolean {
  const received = Buffer.from(receivedToken);
  const expected = Buffer.from(expectedToken);

  return received.length === expected.length && timingSafeEqual(received, expected);
}
