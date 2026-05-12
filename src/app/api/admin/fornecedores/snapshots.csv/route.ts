import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { SupplierProvider, SupplierSourceStatus } from "@/generated/prisma/client";
import { isAdminSession } from "@/lib/admin";
import { buildSupplierSnapshotCsv } from "@/lib/dropshipping/csv-export";
import type { DropshippingDashboardFilters } from "@/lib/dropshipping/queries";

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

function isSupplierProvider(value: string | undefined): value is SupplierProvider {
  return Boolean(value && Object.values(SupplierProvider).includes(value as SupplierProvider));
}

function isSupplierSourceStatus(value: string | undefined): value is SupplierSourceStatus {
  return Boolean(value && Object.values(SupplierSourceStatus).includes(value as SupplierSourceStatus));
}
