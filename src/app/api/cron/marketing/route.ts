import * as Sentry from "@sentry/nextjs";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { runLoyaltyMarketingAutomation } from "@/lib/loyalty/automation";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";

export const dynamic = "force-dynamic";

const cronQuerySchema = z.object({});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimitError = rateLimitRequest(request, {
    intervalMs: 60_000,
    limit: 20,
    name: "cron-marketing"
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
    const parsedQuery = cronQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));

    if (!parsedQuery.success) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const results = await runLoyaltyMarketingAutomation();

    return NextResponse.json({
      ok: true,
      results,
      ranAt: new Date().toISOString()
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: "marketing-cron"
      }
    });

    return NextResponse.json({ error: "Falha ao executar rotinas de marketing." }, { status: 500 });
  }
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
    return { error: "Não autorizado.", ok: false, status: 401 };
  }

  return { ok: true, status: 200 };
}

function safeTokenEquals(receivedToken: string, expectedToken: string): boolean {
  const received = Buffer.from(receivedToken);
  const expected = Buffer.from(expectedToken);

  return received.length === expected.length && timingSafeEqual(received, expected);
}
