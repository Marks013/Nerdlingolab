import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");

    if (contentLength > 16_384) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }

    const report = await request.json().catch(() => null);

    Sentry.captureMessage("CSP report-only violation", {
      extra: {
        report
      },
      level: "warning"
    });
  } catch (error) {
    Sentry.captureException(error);
  }

  return new NextResponse(null, { status: 204 });
}
