import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin";
import { getAdminOrderById } from "@/lib/orders/queries";
import { renderOrderInvoicePdf } from "@/lib/pdf/documents";

interface OrderInvoiceRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, { params }: OrderInvoiceRouteProps): Promise<NextResponse> {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ message: "Acesso não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const order = await getAdminOrderById(id);

    if (!order) {
      return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
    }

    const pdf = await renderOrderInvoicePdf(order);

    return new NextResponse(pdf, {
      headers: {
        "Content-Disposition": `attachment; filename="fatura-${order.orderNumber}.pdf"`,
        "Content-Type": "application/pdf"
      }
    });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json(
      { message: "Não foi possível gerar a fatura." },
      { status: 500 }
    );
  }
}
