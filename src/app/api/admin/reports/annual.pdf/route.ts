import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin";
import { renderAnnualReportPdf } from "@/lib/pdf/documents";
import { getAdminAnnualReport, resolveReportFilters } from "@/lib/reports/queries";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ message: "Acesso não autorizado." }, { status: 401 });
    }

    const requestUrl = new URL(request.url);
    const filters = resolveReportFilters({
      endDate: requestUrl.searchParams.get("fim") ?? undefined,
      startDate: requestUrl.searchParams.get("inicio") ?? undefined
    });
    const report = await getAdminAnnualReport(filters);
    const pdf = await renderAnnualReportPdf(report);

    return new NextResponse(pdf, {
      headers: {
        "Content-Disposition": `attachment; filename="relatorio-${filters.startDate}-${filters.endDate}.pdf"`,
        "Content-Type": "application/pdf"
      }
    });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json(
      { message: "Não foi possível exportar o relatório em PDF." },
      { status: 500 }
    );
  }
}
