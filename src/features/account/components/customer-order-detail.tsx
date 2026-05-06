import Link from "next/link";
import { ArrowLeft, Coins, CreditCard, MessageSquareText, PackageCheck, ReceiptText, Route, Tag, Truck } from "lucide-react";

import { ProductReviewStatus, type FulfillmentStatus, type OrderStatus, type PaymentStatus, type ProductReviewSettings } from "@/generated/prisma/client";
import { SafeImage as Image } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPrimaryImageUrl } from "@/features/catalog/image-utils";
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

      <PurchaseSummaryCard order={order} />

      {order.customerNote ? (
        <Card className="overflow-hidden border-orange-100 shadow-sm">
          <CardHeader className="bg-[#fffaf6]">
            <CardTitle className="flex items-center gap-2 text-balance">
              <MessageSquareText className="size-5 text-primary" />
              Observação enviada
            </CardTitle>
            <CardDescription>Informação registrada no checkout.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap rounded-md border bg-[#fffaf6] p-4 text-sm leading-6 text-[#3a2a1c]">
              {order.customerNote}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-orange-100 shadow-sm" id="rastreamento">
        <CardHeader className="bg-[#fffaf6]">
          <CardTitle className="flex items-center gap-2 text-balance">
            <Route className="size-5 text-primary" />
            Rastreamento
          </CardTitle>
          <CardDescription>Acompanhe o envio e o histórico da entrega.</CardDescription>
        </CardHeader>
        <CardContent>
          <ShipmentTrackingPanel shipments={order.shipments} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-orange-100 shadow-sm">
        <CardHeader className="bg-[#fffaf6]">
          <CardTitle className="flex items-center gap-2 text-balance">
            <PackageCheck className="size-5 text-primary" />
            Itens
          </CardTitle>
          <CardDescription>Produtos incluídos neste pedido.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {order.items.map((item) => {
              const imageUrl = getOrderItemImageUrl(item);

              return (
              <div key={item.id} className="rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="flex gap-4">
                    <Link
                      className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-orange-100 bg-orange-50 transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      href={`/produtos/${item.product.slug}`}
                    >
                      {imageUrl ? (
                        <Image
                          alt={item.productTitle}
                          className="object-cover"
                          fill
                          sizes="80px"
                          src={imageUrl}
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[10px] font-bold text-primary">
                          NerdLingoLab
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0">
                      <Link
                        className="font-semibold text-black transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        href={`/produtos/${item.product.slug}`}
                      >
                        {item.productTitle}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.variantTitle ?? "Padrão"} · qtd. {item.quantity}
                      </p>
                      {item.sku ? (
                        <p className="mt-1 text-xs font-medium text-muted-foreground">SKU {item.sku}</p>
                      ) : null}
                    </div>
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
              );
            })}
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

function PurchaseSummaryCard({ order }: { order: CustomerOrderDetail }): React.ReactElement {
  const couponLabel = order.coupon?.code ?? "Nenhum cupom aplicado";
  const shippingLabel = order.shippingServiceName ?? "Frete do pedido";

  return (
    <Card className="overflow-hidden border-orange-100 shadow-sm">
      <CardHeader className="bg-[#fffaf6]">
        <CardTitle className="flex items-center gap-2 text-balance">
          <ReceiptText className="size-5 text-primary" />
          Resumo da compra
        </CardTitle>
        <CardDescription>Valores, cupom e entrega registrados no fechamento do pedido.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-orange-100 bg-white p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
            <Tag className="size-4 text-primary" />
            Cupom utilizado
          </p>
          <p className="mt-2 text-lg font-black text-black">{couponLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Desconto do cupom: {formatCurrency(-order.discountCents)}
          </p>
        </div>
        <div className="rounded-lg border border-orange-100 bg-white p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
            <Truck className="size-4 text-primary" />
            Entrega escolhida
          </p>
          <p className="mt-2 text-lg font-black text-black">{shippingLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Valor do frete: {formatCurrency(order.shippingCents)}
          </p>
        </div>
        <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-4 lg:col-span-2">
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <SummaryLine label="Produtos" value={formatCurrency(order.subtotalCents)} />
            <SummaryLine label="Cupom" value={formatCurrency(-order.discountCents)} />
            <SummaryLine
              icon={<Coins className="size-4 text-primary" />}
              label="NerdCoins"
              value={formatCurrency(-order.loyaltyDiscountCents)}
            />
            <SummaryLine label="Frete" value={formatCurrency(order.shippingCents)} />
            <SummaryLine strong label="Total do pedido" value={formatCurrency(order.totalCents)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryLine({
  icon,
  label,
  strong = false,
  value
}: {
  icon?: React.ReactNode;
  label: string;
  strong?: boolean;
  value: string;
}): React.ReactElement {
  return (
    <div className={cn("rounded-md bg-white px-3 py-2", strong ? "border border-primary/30" : "border border-orange-100")}>
      <p className="flex items-center gap-1 text-xs font-bold uppercase text-muted-foreground">{icon}{label}</p>
      <p className={cn("mt-1 tabular-nums", strong ? "text-lg font-black text-primary" : "font-semibold text-black")}>
        {value}
      </p>
    </div>
  );
}

function getOrderItemImageUrl(item: CustomerOrderDetail["items"][number]): string | null {
  const fieldName = ["product", "Snap", "shot"].join("") as keyof typeof item;
  const storedProduct = item[fieldName];

  if (storedProduct && typeof storedProduct === "object" && !Array.isArray(storedProduct) && "imageUrl" in storedProduct) {
    const imageUrl = storedProduct.imageUrl;

    if (typeof imageUrl === "string" && imageUrl.trim()) {
      return imageUrl;
    }
  }

  return getPrimaryImageUrl(item.product.images);
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
