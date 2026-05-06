import type { FulfillmentStatus, OrderStatus, PaymentStatus } from "@/generated/prisma/client";

export function formatOrderStatus(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    DRAFT: "Rascunho",
    PENDING_PAYMENT: "Aguardando pagamento",
    PAID: "Pago",
    PROCESSING: "Em preparo",
    SHIPPED: "Enviado",
    DELIVERED: "Entregue",
    CANCELED: "Cancelado",
    REFUNDED: "Reembolsado"
  };

  return labels[status];
}

export function formatPaymentStatus(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    PENDING: "Pendente",
    APPROVED: "Aprovado",
    REJECTED: "Recusado",
    CANCELED: "Cancelado",
    REFUNDED: "Reembolsado",
    CHARGEBACK: "Chargeback"
  };

  return labels[status];
}

export function formatFulfillmentStatus(status: FulfillmentStatus): string {
  const labels: Record<FulfillmentStatus, string> = {
    UNFULFILLED: "Não enviado",
    PARTIAL: "Parcial",
    FULFILLED: "Enviado",
    RETURNED: "Devolvido"
  };

  return labels[status];
}

export function getOrderStatusTone(status: OrderStatus): string {
  const tones: Record<OrderStatus, string> = {
    CANCELED: "border-red-200 bg-red-50 text-red-700",
    DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
    PAID: "border-sky-200 bg-sky-50 text-sky-700",
    PENDING_PAYMENT: "border-amber-200 bg-amber-50 text-amber-800",
    PROCESSING: "border-orange-200 bg-orange-50 text-orange-700",
    REFUNDED: "border-violet-200 bg-violet-50 text-violet-700",
    SHIPPED: "border-blue-200 bg-blue-50 text-blue-700"
  };

  return tones[status];
}

export function getPaymentStatusTone(status: PaymentStatus): string {
  const tones: Record<PaymentStatus, string> = {
    APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELED: "border-red-200 bg-red-50 text-red-700",
    CHARGEBACK: "border-red-300 bg-red-50 text-red-800",
    PENDING: "border-amber-200 bg-amber-50 text-amber-800",
    REFUNDED: "border-violet-200 bg-violet-50 text-violet-700",
    REJECTED: "border-red-200 bg-red-50 text-red-700"
  };

  return tones[status];
}

export function getFulfillmentStatusTone(status: FulfillmentStatus): string {
  const tones: Record<FulfillmentStatus, string> = {
    FULFILLED: "border-blue-200 bg-blue-50 text-blue-700",
    PARTIAL: "border-orange-200 bg-orange-50 text-orange-700",
    RETURNED: "border-violet-200 bg-violet-50 text-violet-700",
    UNFULFILLED: "border-slate-200 bg-slate-50 text-slate-700"
  };

  return tones[status];
}
