import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatOrderStatus, formatPaymentStatus } from "@/features/orders/status-labels";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { CustomerAccountSummary } from "@/lib/orders/queries";

interface AccountOverviewProps {
  account: CustomerAccountSummary;
}

export function AccountOverview({ account }: AccountOverviewProps): React.ReactElement {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{account.user.name ?? "Minha conta"}</CardTitle>
            <CardDescription>{account.user.email}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{account.loyaltyPoints?.balance ?? 0} pontos</CardTitle>
            <CardDescription>Saldo disponível para próximas compras.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Tier atual: {account.loyaltyPoints?.tier ?? "GENIN"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meus pedidos</CardTitle>
          <CardDescription>Acompanhe suas compras recentes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-md border">
            {account.orders.map((order) => (
              <div key={order.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(order.createdAt)} · {formatOrderStatus(order.status)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatPaymentStatus(order.paymentStatus)}
                  </p>
                </div>
                <p className="font-semibold">{formatCurrency(order.totalCents)}</p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/conta/pedidos/${order.id}`}>Ver pedido</Link>
                </Button>
              </div>
            ))}
            {account.orders.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Você ainda não tem pedidos.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
