import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatOrderStatus, formatPaymentStatus } from "@/features/orders/status-labels";
import { ShipmentTrackingPanel } from "@/features/orders/components/shipment-tracking-panel";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { CustomerOrderDetail } from "@/lib/orders/queries";

interface CustomerOrderDetailProps {
  order: CustomerOrderDetail;
}

export function CustomerOrderDetail({ order }: CustomerOrderDetailProps): React.ReactElement {
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
              <div key={item.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-medium">{item.productTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.variantTitle ?? "Padrão"} · qtd. {item.quantity}
                  </p>
                </div>
                <p className="font-semibold">{formatCurrency(item.totalCents)}</p>
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
