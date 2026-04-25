import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin";
import {
  buildAdminReportCsv,
  getAdminAnnualReport,
  resolveReportFilters
} from "@/lib/reports/queries";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ message: "Acesso não autorizado." }, { status: 401 });
    }

    const requestUrl = new URL(request.url);
    const filters = resolveReportFilters({
      startDate: requestUrl.searchParams.get("inicio") ?? undefined,
      endDate: requestUrl.searchParams.get("fim") ?? undefined
    });
    const report = await getAdminAnnualReport(filters);
    const csv = buildAdminReportCsv(report);

    return new NextResponse(csv, {
      headers: {
        "Content-Disposition": `attachment; filename="relatorio-${filters.startDate}-${filters.endDate}.csv"`,
        "Content-Type": "text/csv; charset=utf-8"
      }
    });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json(
      { message: "Não foi possível exportar o relatório." },
      { status: 500 }
    );
  }
}
