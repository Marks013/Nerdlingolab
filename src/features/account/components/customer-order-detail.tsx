import Link from "next/link";
import { ArrowLeft, CreditCard, PackageCheck, ReceiptText } from "lucide-react";

import { ProductReviewStatus, type FulfillmentStatus, type OrderStatus, type PaymentStatus, type ProductReviewSettings } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatContextualOrderStatus,
  formatContextualPaymentStatus,
  getOrderStatusTone,
  getPaymentStatusTone
} from "@/features/orders/status-labels";
import { ShipmentTrackingPanel } from "@/features/orders/components/shipment-tracking-panel";
import { ProductReviewForm } from "@/features/reviews/components/product-review-form";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { CustomerOrderDetail } from "@/lib/orders/queries";
import { cn } from "@/lib/utils";

interface CustomerOrderDetailProps {
  order: CustomerOrderDetail;
  reviewRewardLabel: string;
  reviewSettings: ProductReviewSettings;
}

export function CustomerOrderDetail({
  order,
  reviewRewardLabel,
  reviewSettings
}: CustomerOrderDetailProps): React.ReactElement {
  const canReviewOrder = isOrderEligibleForReview(order, reviewSettings.requireDeliveredOrder);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-orange-100 shadow-sm">
        <CardHeader className="bg-[#fffaf6]">
          <CardTitle className="flex items-center gap-2 text-balance">
            <ReceiptText className="size-5 text-primary" />
            {order.orderNumber}
          </CardTitle>
          <CardDescription>Criado em {formatDateTime(order.createdAt)}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <Status
            className={getOrderStatusTone(order.status)}
            icon={<PackageCheck className="size-4" />}
            label="Pedido"
            value={formatContextualOrderStatus(order.status)}
          />
          <Status
            className={getPaymentStatusTone(order.paymentStatus)}
            icon={<CreditCard className="size-4" />}
            label="Pagamento"
            value={formatContextualPaymentStatus(order.paymentStatus)}
          />
          <Status className="border-orange-200 bg-orange-50 text-primary" label="Total" value={formatCurrency(order.totalCents)} />
        </CardContent>
      </Card>

      {order.customerNote ? (
        <Card>
          <CardHeader>
            <CardTitle>Observacao enviada</CardTitle>
            <CardDescription>Informacao registrada no checkout.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap rounded-md border bg-[#fffaf6] p-4 text-sm leading-6 text-[#3a2a1c]">
              {order.customerNote}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-orange-100 shadow-sm" id="rastreamento">
        <CardHeader>
          <CardTitle>Rastreamento</CardTitle>
          <CardDescription>Acompanhe o envio e o historico da entrega.</CardDescription>
        </CardHeader>
        <CardContent>
          <ShipmentTrackingPanel shipments={order.shipments} />
        </CardContent>
      </Card>

      <Card className="border-orange-100 shadow-sm">
        <CardHeader>
          <CardTitle>Itens</CardTitle>
          <CardDescription>Produtos incluídos neste pedido.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {order.items.map((item) => (
              <div key={item.id} className="rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-medium">{item.productTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.variantTitle ?? "Padrão"} · qtd. {item.quantity}
                    </p>
                  </div>
                  <p className="rounded-lg bg-orange-50 px-3 py-2 font-black text-primary tabular-nums">
                    {formatCurrency(item.totalCents)}
                  </p>
                </div>

                {reviewSettings.isEnabled && canReviewOrder ? (
                  item.review && item.review.status !== ProductReviewStatus.REJECTED ? (
                    <ReviewStatus status={item.review.status} />
                  ) : (
                    <>
                      {item.review?.status === ProductReviewStatus.REJECTED ? (
                        <p className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800">
                          Sua avaliação anterior foi recusada. Você pode reenviar sem as mídias antigas.
                        </p>
                      ) : null}
                      <ProductReviewForm
                        allowImages={reviewSettings.allowImages}
                        allowVideos={reviewSettings.allowVideos}
                        maxImages={reviewSettings.maxImages}
                        maxVideoSeconds={reviewSettings.maxVideoSeconds}
                        maxVideos={reviewSettings.maxVideos}
                        orderItemId={item.id}
                        productTitle={item.productTitle}
                        rewardLabel={reviewRewardLabel}
                      />
                    </>
                  )
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button asChild className="border-primary/50 bg-white hover:bg-primary/10" variant="outline">
        <Link href="/conta#pedidos">
          <ArrowLeft className="mr-2 size-4" />
          Voltar para meus pedidos
        </Link>
      </Button>
    </div>
  );
}

function Status({
  className,
  icon,
  label,
  value
}: {
  className: string;
  icon?: React.ReactNode;
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <p className="flex items-center gap-2 text-xs font-bold uppercase">{icon}{label}</p>
      <p className="mt-2 text-lg font-black tabular-nums">{value}</p>
    </div>
  );
}

function ReviewStatus({ status }: { status: ProductReviewStatus }): React.ReactElement {
  const labelByStatus: Record<ProductReviewStatus, string> = {
    HIDDEN: "Avaliação arquivada pelo admin.",
    PENDING: "Avaliação enviada e aguardando análise.",
    PUBLISHED: "Avaliação aprovada e publicada.",
    REJECTED: "Avaliação recusada."
  };

  return (
    <p className="mt-4 rounded-lg border bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
      {labelByStatus[status]}
    </p>
  );
}

function isOrderEligibleForReview(
  order: { fulfillmentStatus: FulfillmentStatus; paymentStatus: PaymentStatus; status: OrderStatus },
  requireDeliveredOrder: boolean
): boolean {
  if (requireDeliveredOrder) {
    return order.status === "DELIVERED" || order.fulfillmentStatus === "FULFILLED";
  }

  return order.paymentStatus === "APPROVED" || order.status !== "PENDING_PAYMENT";
}
