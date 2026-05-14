import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";

const cspReportSchema = z.unknown().refine(
  (value) => typeof value === "object" && value !== null && !Array.isArray(value),
  "CSP report invalido."
);

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const sameOriginError = assertSameOriginRequest(request);

    if (sameOriginError) {
      return sameOriginError;
    }

    const rateLimitError = rateLimitRequest(request, {
      intervalMs: 60_000,
      limit: 30,
      name: "csp-report"
    });

    if (rateLimitError) {
      return rateLimitError;
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");

    if (contentLength > 16_384) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }

    const report = await request.json().catch(() => null);
    const parsedReport = cspReportSchema.safeParse(report);

    if (!parsedReport.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    Sentry.captureMessage("CSP report-only violation", {
      extra: {
        report: parsedReport.data
      },
      level: "warning"
    });
  } catch (error) {
    Sentry.captureException(error);
  }

  return new NextResponse(null, { status: 204 });
}
