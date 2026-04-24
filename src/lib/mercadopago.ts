import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

import { env } from "@/lib/env";

export const mercadoPagoClient = new MercadoPagoConfig({
  accessToken: env.MERCADO_PAGO_ACCESS_TOKEN ?? "missing-development-token"
});

export const mercadoPagoPreference = new Preference(mercadoPagoClient);
export const mercadoPagoPayment = new Payment(mercadoPagoClient);

export function assertMercadoPagoConfigured(): void {
  if (!env.MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error("Mercado Pago não configurado.");
  }
}
