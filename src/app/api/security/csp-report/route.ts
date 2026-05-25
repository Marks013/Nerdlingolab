import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { rateLimitRequest } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/request";

const cspReportSchema = z.unknown().refine(
  (value) => typeof value === "object" && value !== null && !Array.isArray(value),
  "CSP report invalido."
);

type NormalizedCspReport = {
  blockedUri?: string;
  columnNumber?: number;
  disposition?: string;
  documentUri?: string;
  effectiveDirective?: string;
  lineNumber?: number;
  referrer?: string;
  scriptSample?: string;
  sourceFile?: string;
  statusCode?: number;
  violatedDirective?: string;
};

const BROWSER_EXTENSION_SCHEMES = [
  "chrome-extension:",
  "edge-extension:",
  "extension:",
  "moz-extension:",
  "ms-browser-extension:",
  "safari-extension:"
];

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

    const rawReportBody = getReportBody(parsedReport.data);
    const normalizedReport = normalizeCspReport(rawReportBody);

    if (shouldIgnoreCspReport(rawReportBody, normalizedReport)) {
      return new NextResponse(null, { status: 204 });
    }

    const effectiveDirective = normalizedReport.effectiveDirective ?? "unknown";
    const blockedOrigin = getReportOrigin(normalizedReport.blockedUri);
    const disposition = normalizedReport.disposition ?? "report";

    Sentry.captureMessage("CSP report-only violation", {
      extra: {
        report: normalizedReport
      },
      fingerprint: [
        "csp-report",
        disposition,
        effectiveDirective,
        blockedOrigin
      ],
      tags: {
        csp_blocked_origin: blockedOrigin,
        csp_disposition: disposition,
        csp_effective_directive: effectiveDirective,
        csp_violated_directive: normalizedReport.violatedDirective ?? "unknown"
      },
      level: disposition === "enforce" ? "warning" : "info"
    });
  } catch (error) {
    Sentry.captureException(error);
  }

  return new NextResponse(null, { status: 204 });
}

function normalizeCspReport(body: Record<string, unknown>): NormalizedCspReport {
  return {
    blockedUri: sanitizeUri(getStringField(body, "blocked-uri", "blockedUri")),
    columnNumber: getNumberField(body, "column-number", "columnNumber"),
    disposition: normalizeToken(getStringField(body, "disposition")),
    documentUri: sanitizeUri(getStringField(body, "document-uri", "documentUri")),
    effectiveDirective: normalizeToken(getStringField(body, "effective-directive", "effectiveDirective")),
    lineNumber: getNumberField(body, "line-number", "lineNumber"),
    referrer: sanitizeUri(getStringField(body, "referrer")),
    scriptSample: truncateValue(getStringField(body, "script-sample", "scriptSample"), 240),
    sourceFile: sanitizeUri(getStringField(body, "source-file", "sourceFile")),
    statusCode: getNumberField(body, "status-code", "statusCode"),
    violatedDirective: normalizeToken(getStringField(body, "violated-directive", "violatedDirective"))
  };
}

function shouldIgnoreCspReport(
  rawReport: Record<string, unknown>,
  normalizedReport: NormalizedCspReport
): boolean {
  const reportSources = [
    normalizedReport.blockedUri,
    normalizedReport.documentUri,
    normalizedReport.referrer,
    normalizedReport.scriptSample,
    normalizedReport.sourceFile,
    getStringField(rawReport, "blocked-uri", "blockedUri"),
    getStringField(rawReport, "document-uri", "documentUri"),
    getStringField(rawReport, "referrer"),
    getStringField(rawReport, "script-sample", "scriptSample"),
    getStringField(rawReport, "source-file", "sourceFile")
  ];

  return reportSources.some(containsBrowserExtensionScheme);
}

function getReportBody(report: unknown): Record<string, unknown> {
  const record = isRecord(report) ? report : {};
  const nestedReport = record["csp-report"];

  if (isRecord(nestedReport)) {
    return nestedReport;
  }

  return record;
}

function getStringField(report: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = report[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function getNumberField(report: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = report[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsedValue = Number(value);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return undefined;
}

function getReportOrigin(value: string | undefined): string {
  if (!value) {
    return "unknown";
  }

  if (["data:", "eval", "inline", "self"].includes(value)) {
    return value;
  }

  try {
    return new URL(value).origin;
  } catch {
    return truncateValue(value, 80) ?? "unknown";
  }
}

function sanitizeUri(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmedValue = value.trim();

  if (["data", "eval", "inline", "self"].includes(trimmedValue)) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith("data:") || trimmedValue.startsWith("blob:")) {
    return `${trimmedValue.split(":", 1)[0]}:`;
  }

  try {
    const url = new URL(trimmedValue);

    return truncateValue(`${url.origin}${url.pathname}`, 240);
  } catch {
    return truncateValue(trimmedValue, 240);
  }
}

function normalizeToken(value: string | undefined): string | undefined {
  return truncateValue(value?.trim().toLowerCase(), 120);
}

function containsBrowserExtensionScheme(value: string | undefined): boolean {
  const normalizedValue = value?.trim().toLowerCase();

  return normalizedValue
    ? BROWSER_EXTENSION_SCHEMES.some((scheme) => normalizedValue.includes(scheme))
    : false;
}

function truncateValue(value: string | undefined, maxLength: number): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
