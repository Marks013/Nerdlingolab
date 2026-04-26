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
