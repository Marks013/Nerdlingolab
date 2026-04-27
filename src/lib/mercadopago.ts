import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

export const mercadoPagoClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN ?? "missing-development-token"
});

export const mercadoPagoPreference = new Preference(mercadoPagoClient);
export const mercadoPagoPayment = new Payment(mercadoPagoClient);

export function assertMercadoPagoConfigured(): void {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error("Mercado Pago nao configurado.");
  }
}
