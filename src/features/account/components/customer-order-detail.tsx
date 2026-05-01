import Link from "next/link";

import { ProductReviewStatus, type FulfillmentStatus, type OrderStatus, type PaymentStatus, type ProductReviewSettings } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatOrderStatus, formatPaymentStatus } from "@/features/orders/status-labels";
import { ShipmentTrackingPanel } from "@/features/orders/components/shipment-tracking-panel";
import { ProductReviewForm } from "@/features/reviews/components/product-review-form";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { CustomerOrderDetail } from "@/lib/orders/queries";

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
      <Card>
        <CardHeader>
          <CardTitle>{order.orderNumber}</CardTitle>
          <CardDescription>Criado em {formatDateTime(order.createdAt)}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <Status label="Pedido" value={formatOrderStatus(order.status)} />
          <Status label="Pagamento" value={formatPaymentStatus(order.paymentStatus)} />
          <Status label="Total" value={formatCurrency(order.totalCents)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rastreamento</CardTitle>
          <CardDescription>Acompanhe o envio e o historico da entrega.</CardDescription>
        </CardHeader>
        <CardContent>
          <ShipmentTrackingPanel shipments={order.shipments} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
          <CardDescription>Produtos incluídos neste pedido.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-md border">
            {order.items.map((item) => (
              <div key={item.id} className="p-4">
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-medium">{item.productTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.variantTitle ?? "Padrão"} · qtd. {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(item.totalCents)}</p>
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

      <Button asChild variant="outline">
        <Link href="/conta">Voltar para minha conta</Link>
      </Button>
    </div>
  );
}

function Status({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
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
