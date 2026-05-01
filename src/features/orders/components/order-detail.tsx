import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveManualShipment, syncMelhorEnvioOrderShipment, syncMercadoEnviosOrderShipment } from "@/actions/orders";
import { OrderActions } from "@/features/orders/components/order-actions";
import { ShipmentTrackingPanel } from "@/features/orders/components/shipment-tracking-panel";
import {
  formatFulfillmentStatus,
  formatOrderStatus,
  formatPaymentStatus
} from "@/features/orders/status-labels";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { AdminOrderDetail } from "@/lib/orders/queries";

interface OrderDetailProps {
  order: AdminOrderDetail;
}

export function OrderDetail({ order }: OrderDetailProps): React.ReactElement {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{order.orderNumber}</CardTitle>
            <CardDescription>Criado em {formatDateTime(order.createdAt)}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-3">
            <StatusLine label="Pedido" value={formatOrderStatus(order.status)} />
            <StatusLine label="Pagamento" value={formatPaymentStatus(order.paymentStatus)} />
            <StatusLine label="Envio" value={formatFulfillmentStatus(order.fulfillmentStatus)} />
          </CardContent>
        </Card>

        <OrderItemsCard order={order} />
        <ShippingCard order={order} />
        <LedgerCard order={order} />
      </div>

      <div className="space-y-6">
        <CustomerCard order={order} />
        <TotalsCard order={order} />
        <Card>
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
            <CardDescription>Arquivos administrativos do pedido.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <a href={`/api/admin/orders/${order.id}/invoice.pdf`}>Baixar fatura PDF</a>
            </Button>
          </CardContent>
        </Card>
        <OrderActions order={order} />
      </div>
    </div>
  );
}

function ShippingCard({ order }: OrderDetailProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrega e rastreamento</CardTitle>
        <CardDescription>
          Frete escolhido: {order.shippingServiceName ?? "Não definido"} · {formatCurrency(order.shippingCents)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <ShipmentTrackingPanel shipments={order.shipments} />

        <form action={saveManualShipment.bind(null, order.id)} className="grid gap-3 rounded-md border p-4">
          <p className="font-medium">Registrar rastreio manual</p>
          <Input name="carrierName" placeholder="Transportadora" required />
          <Input name="trackingNumber" placeholder="Código de rastreio" required />
          <Input name="carrierUrl" placeholder="Link de acompanhamento" />
          <button className="rounded-md border px-3 py-2 text-sm font-medium" type="submit">
            Salvar rastreamento
          </button>
        </form>

        <form action={syncMercadoEnviosOrderShipment.bind(null, order.id)} className="grid gap-3 rounded-md border p-4">
          <p className="font-medium">Sincronizar Mercado Envios</p>
          <Input name="externalShipmentId" placeholder="Código de envio Mercado Envios" required />
          <button className="rounded-md border px-3 py-2 text-sm font-medium" type="submit">
            Sincronizar entrega
          </button>
        </form>

        <form action={syncMelhorEnvioOrderShipment.bind(null, order.id)} className="grid gap-3 rounded-md border p-4">
          <p className="font-medium">Sincronizar Melhor Envio</p>
          <Input name="externalShipmentId" placeholder="Código da etiqueta Melhor Envio" required />
          <button className="rounded-md border px-3 py-2 text-sm font-medium" type="submit">
            Sincronizar rastreio
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

function StatusLine({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function OrderItemsCard({ order }: OrderDetailProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Itens</CardTitle>
        <CardDescription>Itens registrados no momento da compra.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y rounded-md border">
          {order.items.map((item) => (
            <div key={item.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-medium">{item.productTitle}</p>
                <p className="text-sm text-muted-foreground">
                  {item.variantTitle ?? "Padrão"} · SKU {item.sku ?? "-"} · qtd. {item.quantity}
                </p>
              </div>
              <p className="font-semibold">{formatCurrency(item.totalCents)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerCard({ order }: OrderDetailProps): React.ReactElement {
  const address = order.shippingAddress as Record<string, string | undefined>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cliente</CardTitle>
        <CardDescription>{order.user?.email ?? order.email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>{order.user?.name ?? order.email}</p>
        <p className="text-muted-foreground">
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
    <Card>
      <CardHeader>
        <CardTitle>Totais</CardTitle>
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
    <Card>
      <CardHeader>
        <CardTitle>Histórico operacional</CardTitle>
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
