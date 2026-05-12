import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";

import { runLoyaltyMarketingAutomation } from "@/lib/loyalty/automation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = authorizeCronRequest(request);

  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
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

function authorizeCronRequest(request: NextRequest): { error?: string; ok: boolean; status: number } {
  const expectedSecret = process.env.CRON_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!expectedSecret) {
    return { error: "CRON_SECRET não configurado.", ok: false, status: 503 };
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";

  if (token !== expectedSecret) {
    return { error: "Não autorizado.", ok: false, status: 401 };
  }

  return { ok: true, status: 200 };
}
