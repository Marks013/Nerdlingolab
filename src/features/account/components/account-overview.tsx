"use client";

import Link from "next/link";
import { useState } from "react";

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
  confirmedAddressLabel?: string;
}

export function AccountOverview({ account, confirmedAddressLabel }: AccountOverviewProps): React.ReactElement {
  const [displayName, setDisplayName] = useState(account.user.name ?? "Minha conta");
  const addresses = account.addresses;
  const [draftAddressLabel, setDraftAddressLabel] = useState(() =>
    typeof window === "undefined" ? "" : window.sessionStorage.getItem("nerdlingolab:draft-address-label") ?? ""
  );
  const previewAddressLabel =
    confirmedAddressLabel && !addresses.some((address) => address.label === confirmedAddressLabel)
      ? confirmedAddressLabel
      : draftAddressLabel;

  function storeDraftAddress(form: HTMLFormElement): void {
    const formData = new FormData(form);
    const label = String(formData.get("label") ?? "").trim();
    const recipient = String(formData.get("recipient") ?? "").trim();
    const postalCode = String(formData.get("postalCode") ?? "").trim();
    const street = String(formData.get("street") ?? "").trim();
    const number = String(formData.get("number") ?? "").trim();
    const complement = String(formData.get("complement") ?? "").trim();
    const district = String(formData.get("district") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const state = String(formData.get("state") ?? "").trim().toUpperCase();

    window.sessionStorage.setItem(
      "nerdlingolab:draft-checkout-address",
      JSON.stringify({ label, recipient, postalCode, street, number, complement, district, city, state })
    );
    window.localStorage.setItem(
      "nerdlingolab:draft-checkout-address",
      JSON.stringify({ label, recipient, postalCode, street, number, complement, district, city, state })
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{displayName}</CardTitle>
            <CardDescription>{account.user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateCustomerProfile} className="grid gap-3">
              <label className="grid gap-2 text-sm font-medium">
                Nome
                <Input
                  defaultValue={account.user.name ?? ""}
                  name="name"
                  onChange={(event) => setDisplayName(event.target.value.trim() || "Minha conta")}
                  required
                />
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
            <CardTitle>{account.loyaltyPoints?.balance ?? 0} Nerdcoins</CardTitle>
            <CardDescription>Saldo disponível para resgate e cupons pessoais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Tier atual: {account.loyaltyPoints?.tier ?? "GENIN"}</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/conta/nerdcoins">Ver Nerdcoins</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Endereços de entrega</CardTitle>
            <CardDescription>Use endereços salvos para acelerar o checkout.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {addresses.map((address) => (
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
              {addresses.length === 0 ? (
                <p className="rounded-md border p-3 text-sm text-muted-foreground">
                  Nenhum endereço salvo.
                </p>
              ) : null}
            </div>
            <form
              action={createCustomerAddress}
              className="grid gap-3"
              onChange={(event) => storeDraftAddress(event.currentTarget)}
              onSubmit={(event) => storeDraftAddress(event.currentTarget)}
            >
              <label className="grid gap-2 text-sm font-medium">
                Apelido
                <Input
                  name="label"
                  onChange={(event) => {
                    const nextLabel = event.target.value.trim();
                    setDraftAddressLabel(nextLabel);
                    window.sessionStorage.setItem("nerdlingolab:draft-address-label", nextLabel);
                  }}
                  placeholder="Casa"
                />
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
            {previewAddressLabel ? (
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">{previewAddressLabel}</p>
                <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  Endereço padrão
                </span>
              </div>
            ) : null}
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
