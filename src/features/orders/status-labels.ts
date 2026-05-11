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

export function formatContextualOrderStatus(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    CANCELED: "Pedido cancelado",
    DELIVERED: "Pedido entregue",
    DRAFT: "Pedido em rascunho",
    PAID: "Pedido pago",
    PENDING_PAYMENT: "Pedido aguardando pagamento",
    PROCESSING: "Pedido em preparo",
    REFUNDED: "Pedido reembolsado",
    SHIPPED: "Pedido enviado"
  };

  return labels[status];
}

export function formatContextualPaymentStatus(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    APPROVED: "Pagamento aprovado",
    CANCELED: "Pagamento cancelado",
    CHARGEBACK: "Pagamento em chargeback",
    PENDING: "Pagamento pendente",
    REFUNDED: "Pagamento reembolsado",
    REJECTED: "Pagamento recusado"
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
    CANCELED: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200",
    DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200",
    DRAFT: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/40 dark:bg-slate-900/60 dark:text-slate-200",
    PAID: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-950/30 dark:text-sky-200",
    PENDING_PAYMENT: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200",
    PROCESSING: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-950/30 dark:text-orange-200",
    REFUNDED: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-950/30 dark:text-violet-200",
    SHIPPED: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-950/30 dark:text-blue-200"
  };

  return tones[status];
}

export function getPaymentStatusTone(status: PaymentStatus): string {
  const tones: Record<PaymentStatus, string> = {
    APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200",
    CANCELED: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200",
    CHARGEBACK: "border-red-300 bg-red-50 text-red-800 dark:border-red-500/50 dark:bg-red-950/35 dark:text-red-100",
    PENDING: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200",
    REFUNDED: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-950/30 dark:text-violet-200",
    REJECTED: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200"
  };

  return tones[status];
}

export function getFulfillmentStatusTone(status: FulfillmentStatus): string {
  const tones: Record<FulfillmentStatus, string> = {
    FULFILLED: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-950/30 dark:text-blue-200",
    PARTIAL: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-950/30 dark:text-orange-200",
    RETURNED: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-950/30 dark:text-violet-200",
    UNFULFILLED: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/40 dark:bg-slate-900/60 dark:text-slate-200"
  };

  return tones[status];
}
