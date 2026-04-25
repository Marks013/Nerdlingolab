import Link from "next/link";

import {
  createCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress
} from "@/actions/account-addresses";
import { updateCustomerProfile } from "@/actions/account-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
          <CardContent>
            <form action={updateCustomerProfile} className="grid gap-3">
              <label className="grid gap-2 text-sm font-medium">
                Nome
                <Input defaultValue={account.user.name ?? ""} name="name" required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Telefone
                <Input defaultValue={account.user.phone ?? ""} name="phone" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                CPF
                <Input defaultValue={account.user.cpf ?? ""} name="cpf" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Nascimento
                <Input defaultValue={formatBirthdayInput(account.user.birthday)} name="birthday" type="date" />
              </label>
              <Button type="submit">Salvar dados</Button>
            </form>
          </CardContent>
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
        <Card>
          <CardHeader>
            <CardTitle>Endereços de entrega</CardTitle>
            <CardDescription>Use endereços salvos para acelerar o checkout.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {account.addresses.map((address) => (
                <div key={address.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{address.label || address.recipient}</p>
                      <p className="text-muted-foreground">
                        {address.street}, {address.number}
                        {address.complement ? ` - ${address.complement}` : ""}
                      </p>
                      <p className="text-muted-foreground">
                        {address.district}, {address.city} - {address.state}
                      </p>
                      <p className="text-muted-foreground">CEP {address.postalCode}</p>
                    </div>
                    {address.isDefault ? (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        Endereço padrão
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!address.isDefault ? (
                      <form action={setDefaultCustomerAddress.bind(null, address.id)}>
                        <Button size="sm" type="submit" variant="outline">
                          Tornar padrão
                        </Button>
                      </form>
                    ) : null}
                    <form action={deleteCustomerAddress.bind(null, address.id)}>
                      <Button size="sm" type="submit" variant="ghost">
                        Remover
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
              {account.addresses.length === 0 ? (
                <p className="rounded-md border p-3 text-sm text-muted-foreground">
                  Nenhum endereço salvo.
                </p>
              ) : null}
            </div>
            <form action={createCustomerAddress} className="grid gap-3">
              <label className="grid gap-2 text-sm font-medium">
                Apelido
                <Input name="label" placeholder="Casa" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Destinatário
                <Input name="recipient" required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                CEP
                <Input name="postalCode" required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Rua
                <Input name="street" required />
              </label>
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <label className="grid gap-2 text-sm font-medium">
                  Número
                  <Input name="number" required />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Complemento
                  <Input name="complement" />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-medium">
                Bairro
                <Input name="district" required />
              </label>
              <div className="grid gap-3 sm:grid-cols-[1fr_80px]">
                <label className="grid gap-2 text-sm font-medium">
                  Cidade
                  <Input name="city" required />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  UF
                  <Input maxLength={2} name="state" required />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input className="h-4 w-4" name="isDefault" type="checkbox" value="true" />
                Endereço padrão
              </label>
              <Button type="submit">Salvar endereço</Button>
            </form>
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

function formatBirthdayInput(value: Date | null): string {
  return value?.toISOString().slice(0, 10) ?? "";
}
