import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";

import { syncDueProductSources } from "@/lib/dropshipping/sync";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = authorizeCronRequest(request);

  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
    const results = await syncDueProductSources(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50);

    return NextResponse.json({
      ok: true,
      results,
      ranAt: new Date().toISOString()
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: "dropshipping-cron"
      }
    });

    return NextResponse.json({ error: "Falha ao executar sync de fornecedores." }, { status: 500 });
  }
}

function authorizeCronRequest(request: NextRequest): { error?: string; ok: boolean; status: number } {
  const expectedSecret = process.env.CRON_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!expectedSecret) {
    return { error: "CRON_SECRET nao configurado.", ok: false, status: 503 };
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";

  if (token !== expectedSecret) {
    return { error: "Nao autorizado.", ok: false, status: 401 };
  }

  return { ok: true, status: 200 };
}

