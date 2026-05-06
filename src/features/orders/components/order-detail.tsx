import Link from "next/link";
import { ClipboardList, CreditCard, FileText, MapPin, MessageSquareText, PackageCheck, ReceiptText, RotateCcw, ShieldAlert, Tag, Truck, UserRound } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveManualShipment, syncMelhorEnvioOrderShipment, syncMercadoEnviosOrderShipment } from "@/actions/orders";
import { SafeImage as Image } from "@/components/media/safe-image";
import { getPrimaryImageUrl } from "@/features/catalog/image-utils";
import { OrderActions } from "@/features/orders/components/order-actions";
import { ShipmentTrackingPanel } from "@/features/orders/components/shipment-tracking-panel";
import {
  formatContextualOrderStatus,
  formatContextualPaymentStatus,
  formatFulfillmentStatus,
  getFulfillmentStatusTone,
  getOrderStatusTone,
  getPaymentStatusTone
} from "@/features/orders/status-labels";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { AdminOrderDetail } from "@/lib/orders/queries";
import { cn } from "@/lib/utils";

interface OrderDetailProps {
  order: AdminOrderDetail;
}

export function OrderDetail({ order }: OrderDetailProps): React.ReactElement {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Card className="overflow-hidden border-orange-100 shadow-sm">
          <CardHeader className="bg-[#fffaf6]">
            <CardTitle className="flex items-center gap-2 text-balance text-2xl font-black">
              <ReceiptText className="size-6 text-primary" />
              {order.orderNumber}
            </CardTitle>
            <CardDescription>Criado em {formatDateTime(order.createdAt)}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-3">
            <StatusLine
              className={getOrderStatusTone(order.status)}
              icon={<PackageCheck className="size-4" />}
              label="Pedido"
              value={formatContextualOrderStatus(order.status)}
            />
            <StatusLine
              className={getPaymentStatusTone(order.paymentStatus)}
              icon={<CreditCard className="size-4" />}
              label="Pagamento"
              value={formatContextualPaymentStatus(order.paymentStatus)}
            />
            <StatusLine
              className={getFulfillmentStatusTone(order.fulfillmentStatus)}
              icon={<Truck className="size-4" />}
              label="Entrega"
              value={formatFulfillmentStatus(order.fulfillmentStatus)}
            />
          </CardContent>
        </Card>

        <OrderItemsCard order={order} />
        <CancellationCard order={order} />
        <CustomerNoteCard order={order} />
        <ShippingCard order={order} />
        <LedgerCard order={order} />
      </div>

      <div className="space-y-6">
        <CustomerCard order={order} />
        <TotalsCard order={order} />
        <Card className="overflow-hidden border-orange-100 shadow-sm">
          <CardHeader className="bg-[#fffaf6]">
            <CardTitle className="flex items-center gap-2 text-balance">
              <FileText className="size-5 text-primary" />
              Documentos
            </CardTitle>
            <CardDescription>Arquivos administrativos do pedido.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full border-primary/50 bg-white text-primary hover:bg-primary/10" variant="outline">
              <a href={`/api/admin/orders/${order.id}/invoice.pdf`}>Baixar fatura PDF</a>
            </Button>
          </CardContent>
        </Card>
        <OrderActions order={order} />
      </div>
    </div>
  );
}

function CancellationCard({ order }: OrderDetailProps): React.ReactElement | null {
  if (!order.cancellationReason) {
    return null;
  }

  return (
    <Card className="overflow-hidden border-orange-200 bg-orange-50/70 shadow-sm dark:bg-orange-950/20">
      <CardHeader className="bg-orange-100/60">
        <CardTitle className="flex items-center gap-2 text-balance">
          <RotateCcw className="size-5 text-primary" />
          Cancelamento e reembolso
        </CardTitle>
        <CardDescription>
          {order.refundedAt
            ? `Reembolso registrado em ${formatDateTime(order.refundedAt)}`
            : order.canceledAt
              ? `Cancelado em ${formatDateTime(order.canceledAt)}`
              : "Pedido cancelado"}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <p className="whitespace-pre-wrap rounded-md border bg-background p-4 leading-6">
          {order.cancellationReason}
        </p>
        {order.refundStatus ? (
          <StatusLine
            className="border-violet-200 bg-white text-violet-700"
            icon={<RotateCcw className="size-4" />}
            label="Reembolso Mercado Pago"
            value={`${order.refundStatus}${order.refundAmountCents ? ` / ${formatCurrency(order.refundAmountCents)}` : ""}`}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function CustomerNoteCard({ order }: OrderDetailProps): React.ReactElement | null {
  if (!order.customerNote) {
    return null;
  }

  return (
    <Card className="overflow-hidden border-orange-100 shadow-sm">
      <CardHeader className="bg-[#fffaf6]">
        <CardTitle className="flex items-center gap-2 text-balance">
          <MessageSquareText className="size-5 text-primary" />
          Observação do cliente
        </CardTitle>
        <CardDescription>Mensagem informada no checkout.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap rounded-md border bg-[#fffaf6] p-4 text-sm leading-6 text-[#3a2a1c]">
          {order.customerNote}
        </p>
      </CardContent>
    </Card>
  );
}

function ShippingCard({ order }: OrderDetailProps): React.ReactElement {
  return (
    <Card className="overflow-hidden border-orange-100 shadow-sm" id="rastreamento">
      <CardHeader className="bg-[#fffaf6]">
        <CardTitle className="flex items-center gap-2 text-balance">
          <Truck className="size-5 text-primary" />
          Entrega e rastreamento
        </CardTitle>
        <CardDescription>
          Frete escolhido: {order.shippingServiceName ?? "Não definido"} · {formatCurrency(order.shippingCents)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <ShipmentTrackingPanel shipments={order.shipments} />

        <form action={saveManualShipment.bind(null, order.id)} className="grid gap-3 rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 font-bold text-black">
            <ClipboardList className="size-4 text-primary" />
            Registrar rastreio manual
          </p>
          <Input name="carrierName" placeholder="Transportadora" required />
          <Input name="trackingNumber" placeholder="Código de rastreio" required />
          <Input name="carrierUrl" placeholder="Link de acompanhamento" />
          <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-black text-white transition hover:bg-emerald-700" type="submit">
            Salvar rastreamento
          </button>
        </form>

        <form action={syncMercadoEnviosOrderShipment.bind(null, order.id)} className="grid gap-3 rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 font-bold text-black">
            <ShieldAlert className="size-4 text-primary" />
            Sincronizar Mercado Envios
          </p>
          <Input name="externalShipmentId" placeholder="Código de envio Mercado Envios" required />
          <button className="rounded-md bg-primary px-3 py-2 text-sm font-black text-white transition hover:bg-primary/90" type="submit">
            Sincronizar entrega
          </button>
        </form>

        <form action={syncMelhorEnvioOrderShipment.bind(null, order.id)} className="grid gap-3 rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 font-bold text-black">
            <Truck className="size-4 text-primary" />
            Sincronizar Melhor Envio
          </p>
          <Input name="externalShipmentId" placeholder="Código da etiqueta Melhor Envio" required />
          <button className="rounded-md bg-primary px-3 py-2 text-sm font-black text-white transition hover:bg-primary/90" type="submit">
            Sincronizar rastreio
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

function StatusLine({
  className,
  icon,
  label,
  value
}: {
  className?: string;
  icon?: React.ReactNode;
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className={cn("rounded-lg border p-4", className ?? "border-orange-100 bg-white text-black")}>
      <p className="flex items-center gap-2 text-xs font-bold uppercase">{icon}{label}</p>
      <p className="mt-2 text-lg font-black tabular-nums">{value}</p>
    </div>
  );
}

function OrderItemsCard({ order }: OrderDetailProps): React.ReactElement {
  return (
    <Card className="overflow-hidden border-orange-100 shadow-sm">
      <CardHeader className="bg-[#fffaf6]">
        <CardTitle className="flex items-center gap-2 text-balance">
          <PackageCheck className="size-5 text-primary" />
          Itens
        </CardTitle>
        <CardDescription>Itens registrados no momento da compra.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {order.items.map((item) => {
            const imageUrl = getPrimaryImageUrl(item.product.images);

            return (
            <div key={item.id} className="rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex gap-4">
                  <Link
                    className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-orange-100 bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    href={`/produtos/${item.product.slug}`}
                  >
                    {imageUrl ? (
                      <Image alt={item.productTitle} className="object-cover" fill sizes="64px" src={imageUrl} />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] font-bold text-primary">NLL</span>
                    )}
                  </Link>
                  <div className="min-w-0">
                    <Link className="font-semibold text-black transition hover:text-primary" href={`/produtos/${item.product.slug}`}>
                      {item.productTitle}
                    </Link>
                <p className="text-sm text-muted-foreground">
                  {item.variantTitle ?? "Padrão"} · SKU {item.sku ?? "-"} · qtd. {item.quantity}
                </p>
                  </div>
                </div>
                <p className="rounded-lg bg-orange-50 px-3 py-2 font-black text-primary tabular-nums">{formatCurrency(item.totalCents)}</p>
              </div>
            </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerCard({ order }: OrderDetailProps): React.ReactElement {
  const address = order.shippingAddress as Record<string, string | undefined>;

  return (
    <Card className="overflow-hidden border-orange-100 shadow-sm">
      <CardHeader className="bg-[#fffaf6]">
        <CardTitle className="flex items-center gap-2 text-balance">
          <UserRound className="size-5 text-primary" />
          Cliente
        </CardTitle>
        <CardDescription>{order.user?.email ?? order.email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>{order.user?.name ?? order.email}</p>
        <p className="rounded-lg border border-orange-100 bg-white p-3 text-muted-foreground">
          <MapPin className="mb-2 size-4 text-primary" />
          {address.street}, {address.number} · {address.district}
          <br />
          {address.city}/{address.state} · {address.postalCode}
        </p>
      </CardContent>
    </Card>
  );
}

function TotalsCard({ order }: OrderDetailProps): React.ReactElement {
  return (
    <Card className="overflow-hidden border-orange-100 shadow-sm">
      <CardHeader className="bg-[#fffaf6]">
        <CardTitle className="flex items-center gap-2 text-balance">
          <Tag className="size-5 text-primary" />
          Totais
        </CardTitle>
        <CardDescription>{order.coupon?.code ? `Cupom ${order.coupon.code}` : "Sem cupom"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <MoneyLine label="Subtotal" value={order.subtotalCents} />
        <MoneyLine label="Cupom" value={-order.discountCents} />
        <MoneyLine label="Pontos" value={-order.loyaltyDiscountCents} />
        <MoneyLine label="Frete" value={order.shippingCents} />
        <MoneyLine label="Total" strong value={order.totalCents} />
      </CardContent>
    </Card>
  );
}

function MoneyLine({
  label,
  value,
  strong = false
}: {
  label: string;
  value: number;
  strong?: boolean;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "font-semibold" : undefined}>{formatCurrency(value)}</span>
    </div>
  );
}

function LedgerCard({ order }: OrderDetailProps): React.ReactElement {
  return (
    <Card className="overflow-hidden border-orange-100 shadow-sm">
      <CardHeader className="bg-[#fffaf6]">
        <CardTitle className="flex items-center gap-2 text-balance">
          <ClipboardList className="size-5 text-primary" />
          Histórico operacional
        </CardTitle>
        <CardDescription>Movimentos de estoque e fidelidade vinculados ao pedido.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <AuditBlock
          empty="Sem movimentos de fidelidade."
          items={order.loyaltyLedger.map((entry) => `${entry.type}: ${entry.pointsDelta} ponto(s)`)}
          title="Fidelidade"
        />
        <AuditBlock
          empty="Sem movimentos de estoque."
          items={order.inventoryLedger.map((entry) => `${entry.type}: ${entry.quantityDelta}`)}
          title="Estoque"
        />
      </CardContent>
    </Card>
  );
}

function AuditBlock({
  title,
  items,
  empty
}: {
  title: string;
  items: string[];
  empty: string;
}): React.ReactElement {
  return (
    <div>
      <p className="font-medium">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
