import { assertMercadoPagoConfigured } from "@/lib/mercadopago";

interface MercadoPagoRefundResponse {
  amount?: number;
  id?: number | string;
  payment_id?: number | string;
  status?: string;
}

export interface MercadoPagoRefundResult {
  amountCents: number | null;
  providerId: string | null;
  status: string;
}

export async function refundMercadoPagoPayment({
  idempotencyKey,
  paymentId
}: {
  idempotencyKey: string;
  paymentId: string;
}): Promise<MercadoPagoRefundResult> {
  assertMercadoPagoConfigured();

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}/refunds`, {
    body: "{}",
    headers: {
      Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey
    },
    method: "POST"
  });
  const payload = await response.json().catch(() => null) as MercadoPagoRefundResponse | { message?: string } | null;

  if (!response.ok) {
    const message = payload && "message" in payload && payload.message
      ? payload.message
      : `Mercado Pago recusou o reembolso (${response.status}).`;

    throw new Error(message);
  }

  const refund = payload as MercadoPagoRefundResponse;

  return {
    amountCents: typeof refund.amount === "number" ? Math.round(refund.amount * 100) : null,
    providerId: refund.id ? String(refund.id) : null,
    status: refund.status ?? "requested"
  };
}
