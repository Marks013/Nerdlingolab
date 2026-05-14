import * as Sentry from "@sentry/nextjs";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { runNewsletterDeliveryProcessor } from "@/lib/newsletter/delivery-processor";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";

export const dynamic = "force-dynamic";

const cronQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimitError = rateLimitRequest(request, {
    intervalMs: 60_000,
    limit: 30,
    name: "cron-newsletter"
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
    const parsedQuery = cronQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });

    if (!parsedQuery.success) {
      return NextResponse.json({ error: "Parametros invalidos." }, { status: 400 });
    }

    const results = await runNewsletterDeliveryProcessor(parsedQuery.data.limit);

    return NextResponse.json({
      ok: true,
      results,
      ranAt: new Date().toISOString()
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: "newsletter-cron"
      }
    });

    return NextResponse.json({ error: "Falha ao processar entregas da newsletter." }, { status: 500 });
  }
}

function hasBearerToken(request: NextRequest): boolean {
  return request.headers.get("authorization")?.startsWith("Bearer ") ?? false;
}

function authorizeCronRequest(request: NextRequest): { error?: string; ok: boolean; status: number } {
  const expectedSecret = process.env.CRON_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!expectedSecret) {
    return { error: "CRON_SECRET nao configurado.", ok: false, status: 503 };
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";

  if (!safeTokenEquals(token, expectedSecret)) {
    return { error: "Nao autorizado.", ok: false, status: 401 };
  }

  return { ok: true, status: 200 };
}

function safeTokenEquals(receivedToken: string, expectedToken: string): boolean {
  const received = Buffer.from(receivedToken);
  const expected = Buffer.from(expectedToken);

  return received.length === expected.length && timingSafeEqual(received, expected);
}
