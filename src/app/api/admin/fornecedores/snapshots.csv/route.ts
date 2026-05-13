import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { SupplierProvider, SupplierSourceStatus } from "@/generated/prisma/client";
import { isAdminSession } from "@/lib/admin";
import { buildSupplierSnapshotCsv } from "@/lib/dropshipping/csv-export";
import { importSupplierSnapshotCsv } from "@/lib/dropshipping/import";
import type { DropshippingDashboardFilters } from "@/lib/dropshipping/queries";

const maxImportFileSize = 2_000_000;

export async function GET(request: Request): Promise<NextResponse> {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ message: "Acesso nao autorizado." }, { status: 401 });
    }

    const filters = resolveExportFilters(new URL(request.url).searchParams);
    const csv = await buildSupplierSnapshotCsv(filters);
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Disposition": `attachment; filename="fornecedores-importacao-assistida-${date}.csv"`,
        "Content-Type": "text/csv; charset=utf-8"
      }
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: "supplier-assisted-import-export"
      }
    });

    return NextResponse.json(
      { message: "Nao foi possivel gerar o CSV de fornecedores." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ message: "Acesso nao autorizado." }, { status: 401 });
    }

    const formData = await request.formData();
    const filters = resolveImportFilters(formData);
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return redirectWithNotice(request, "Envie um arquivo CSV valido.", "warning", filters);
    }

    if (file.size > maxImportFileSize) {
      return redirectWithNotice(request, "Arquivo muito grande. Envie um CSV de ate 2 MB.", "warning", filters);
    }

    if (!isCsvFile(file)) {
      return redirectWithNotice(request, "Envie um arquivo .csv valido.", "warning", filters);
    }

    const result = await importSupplierSnapshotCsv(await file.text());
    const details = [
      `${result.imported} importado(s)`,
      `${result.skipped} ignorado(s)`,
      `${result.invalid} invalido(s)`,
      `${result.missing} sem origem localizada`
    ].join(", ");
    const suffix = result.errors.length ? ` Primeiros erros: ${result.errors.slice(0, 3).join(" | ")}` : "";
    const params = new URLSearchParams({
      errors: String(result.errors.length),
      imported: String(result.imported),
      invalid: String(result.invalid),
      matchedByExternal: String(result.matchedByExternal),
      matchedBySourceId: String(result.matchedBySourceId),
      matchedByUrl: String(result.matchedByUrl),
      missing: String(result.missing),
      notice: `Importacao assistida concluida: ${details}.${suffix}`,
      noticeType: result.errors.length || result.invalid ? "warning" : "success",
      skipped: String(result.skipped),
      updatedPrice: String(result.updatedPrice),
      updatedStatus: String(result.updatedStatus),
      updatedStock: String(result.updatedStock),
      updatedTitle: String(result.updatedTitle)
    });
    const filterParams = buildSupplierFilterParams(filters);

    filterParams.forEach((value, key) => params.set(key, value));

    if (result.errors.length) {
      params.set("importDetails", result.errors.slice(0, 5).join(" | "));
    }

    revalidatePath("/admin/fornecedores");
    revalidatePath("/admin/produtos");
    revalidatePath("/produtos");

    return NextResponse.redirect(buildAdminSuppliersRedirectUrl(request, params), 303);
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: "supplier-assisted-import-post"
      }
    });

    return redirectWithNotice(request, "Nao foi possivel importar o CSV de fornecedores.", "warning");
  }
}

function resolveExportFilters(searchParams: URLSearchParams): DropshippingDashboardFilters {
  const provider = searchParams.get("fornecedor") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const query = searchParams.get("busca")?.trim() || undefined;

  return {
    provider: isSupplierProvider(provider) ? provider : undefined,
    query,
    status: isSupplierSourceStatus(status) ? status : undefined
  };
}

function resolveImportFilters(formData: FormData): DropshippingDashboardFilters {
  const provider = normalizeOptionalText(formData.get("fornecedor"));
  const status = normalizeOptionalText(formData.get("status"));
  const query = normalizeOptionalText(formData.get("busca"));

  return {
    provider: isSupplierProvider(provider) ? provider : undefined,
    query,
    status: isSupplierSourceStatus(status) ? status : undefined
  };
}

function isSupplierProvider(value: string | undefined): value is SupplierProvider {
  return Boolean(value && Object.values(SupplierProvider).includes(value as SupplierProvider));
}

function isSupplierSourceStatus(value: string | undefined): value is SupplierSourceStatus {
  return Boolean(value && Object.values(SupplierSourceStatus).includes(value as SupplierSourceStatus));
}

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv") || ["text/csv", "application/vnd.ms-excel"].includes(file.type);
}

function redirectWithNotice(request: Request, notice: string, noticeType: "success" | "warning", filters: DropshippingDashboardFilters = {}): NextResponse {
  const params = new URLSearchParams({
    notice,
    noticeType
  });
  const filterParams = buildSupplierFilterParams(filters);

  filterParams.forEach((value, key) => params.set(key, value));

  return NextResponse.redirect(buildAdminSuppliersRedirectUrl(request, params), 303);
}

function buildSupplierFilterParams(filters: DropshippingDashboardFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set("busca", filters.query);
  }

  if (filters.provider) {
    params.set("fornecedor", filters.provider);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  return params;
}

function normalizeOptionalText(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";

  return text || undefined;
}

function buildAdminSuppliersRedirectUrl(request: Request, params: URLSearchParams): URL {
  const baseUrl = resolvePublicBaseUrl(request);

  return new URL(`/admin/fornecedores?${params.toString()}`, baseUrl);
}

function resolvePublicBaseUrl(request: Request): string {
  const origin = request.headers.get("origin");

  if (isPublicHttpOrigin(origin)) {
    return origin;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost && !isInternalHost(forwardedHost)) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = request.headers.get("host");

  if (host && !isInternalHost(host)) {
    return `${requestUrlProtocol(request)}//${host}`;
  }

  return (process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "https://nerdlingolab.com").replace(/\/+$/, "");
}

function isPublicHttpOrigin(value: string | null): value is string {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);

    return ["http:", "https:"].includes(url.protocol) && !isInternalHost(url.host);
  } catch {
    return false;
  }
}

function isInternalHost(host: string): boolean {
  return /^(0\.0\.0\.0|127\.0\.0\.1|localhost)(?::\d+)?$/i.test(host);
}

function requestUrlProtocol(request: Request): string {
  try {
    return new URL(request.url).protocol;
  } catch {
    return "https:";
  }
}
