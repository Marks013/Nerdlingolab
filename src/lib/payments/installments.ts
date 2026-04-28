export interface PaymentTerms {
  cardInstallmentMonthlyRateBps: number;
  maxInstallments: number;
  paymentFeeSource: "MANUAL" | "MERCADO_PAGO";
  pixDiscountBps: number;
}

export interface InstallmentQuote {
  installment: number;
  totalCents: number;
  valueCents: number;
}

export function calculatePixPriceCents(priceCents: number, pixDiscountBps: number): number {
  const discountBps = clampInteger(pixDiscountBps, 0, 5_000);
  return Math.max(0, Math.round(priceCents * (10_000 - discountBps) / 10_000));
}

export function calculateInstallments({
  maxInstallments,
  monthlyRateBps,
  priceCents
}: {
  maxInstallments: number;
  monthlyRateBps: number;
  priceCents: number;
}): InstallmentQuote[] {
  const installments = clampInteger(maxInstallments, 1, 24);
  const rate = clampInteger(monthlyRateBps, 0, 2_000) / 10_000;

  return Array.from({ length: installments }, (_, index) => {
    const installment = index + 1;
    const totalCents = rate > 0 && installment > 1
      ? Math.round(priceCents * Math.pow(1 + rate, installment))
      : priceCents;

    return {
      installment,
      totalCents,
      valueCents: Math.ceil(totalCents / installment)
    };
  });
}

function clampInteger(value: number, min: number, max: number): number {
  return Number.isInteger(value) && value >= min && value <= max ? value : min;
}
