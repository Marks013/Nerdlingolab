"use client";

import Link from "next/link";
import { Coins, Eye, PackageCheck, PlusCircle, Truck } from "lucide-react";
import { useState } from "react";

import { deleteOwnCustomerAccount } from "@/actions/account-deletion";
import {
  createCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress
} from "@/actions/account-addresses";
import { updateCustomerProfile } from "@/actions/account-profile";
import { signOutFromCustomer } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  formatOrderStatus,
  formatPaymentStatus,
  getOrderStatusTone,
  getPaymentStatusTone
} from "@/features/orders/status-labels";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { formatCpf } from "@/lib/identity/brazil";
import type { CustomerAccountSummary } from "@/lib/orders/queries";
import { cn } from "@/lib/utils";

interface AccountOverviewProps {
  account: CustomerAccountSummary;
  confirmedAddressLabel?: string;
}

type AddressDraft = {
  city: string;
  complement: string;
  district: string;
  number: string;
  postalCode: string;
  recipient: string;
  state: string;
  street: string;
};

export function AccountOverview({ account, confirmedAddressLabel }: AccountOverviewProps): React.ReactElement {
  const initialProfileDraft = {
    birthday: formatBirthdayInput(account.user.birthday),
    cpf: formatCpf(account.user.cpf),
    name: account.user.name ?? "",
    phone: account.user.phone ?? ""
  };
  const [displayName, setDisplayName] = useState(account.user.name ?? "Minha conta");
  const [savedProfileDraft, setSavedProfileDraft] = useState(initialProfileDraft);
  const [profileDraft, setProfileDraft] = useState(initialProfileDraft);
  const addresses = account.addresses;
  const isGoogleLinked = account.accounts.some((linkedAccount) => linkedAccount.provider === "google");
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(addresses.length === 0);
  const [postalCodeStatus, setPostalCodeStatus] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>({
    city: "",
    complement: "",
    district: "",
    number: "",
    postalCode: "",
    recipient: "",
    state: "",
    street: ""
  });
  const [draftAddressLabel, setDraftAddressLabel] = useState(() =>
    typeof window === "undefined" ? "" : window.sessionStorage.getItem("nerdlingolab:draft-address-label") ?? ""
  );
  const previewAddressLabel =
    confirmedAddressLabel && !addresses.some((address) => address.label === confirmedAddressLabel)
      ? confirmedAddressLabel
      : draftAddressLabel;
  const isProfileDirty =
    profileDraft.name !== savedProfileDraft.name ||
    profileDraft.phone !== savedProfileDraft.phone ||
    profileDraft.cpf !== savedProfileDraft.cpf ||
    profileDraft.birthday !== savedProfileDraft.birthday;

  function updateProfileDraft(field: keyof typeof initialProfileDraft, value: string): void {
    setProfileDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  }

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

  function updateAddressDraft(field: keyof AddressDraft, value: string): void {
    setAddressDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  }

  async function lookupPostalCode(value: string): Promise<void> {
    const postalCode = value.replace(/\D/g, "").slice(0, 8);
    updateAddressDraft("postalCode", postalCode);

    if (postalCode.length !== 8) {
      setPostalCodeStatus(null);
      return;
    }

    setPostalCodeStatus("Buscando endereço...");

    try {
      const response = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`);
      const payload = await response.json() as {
        bairro?: string;
        complemento?: string;
        erro?: boolean;
        localidade?: string;
        logradouro?: string;
        uf?: string;
      };

      if (!response.ok || payload.erro) {
        setPostalCodeStatus("CEP não encontrado. Preencha manualmente.");
        return;
      }

      setAddressDraft((currentDraft) => ({
        ...currentDraft,
        city: payload.localidade ?? currentDraft.city,
        complement: currentDraft.complement || payload.complemento || "",
        district: payload.bairro ?? currentDraft.district,
        postalCode,
        state: payload.uf ?? currentDraft.state,
        street: payload.logradouro ?? currentDraft.street
      }));
      setPostalCodeStatus("Endereço preenchido. Você pode editar qualquer campo.");
    } catch {
      setPostalCodeStatus("Não foi possível consultar o CEP agora. Preencha manualmente.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{displayName}</CardTitle>
            <CardDescription>{account.user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              action={updateCustomerProfile}
              className="grid gap-3"
              onSubmit={() => setSavedProfileDraft(profileDraft)}
            >
              <label className="grid gap-2 text-sm font-medium">
                Nome
                <Input
                  name="name"
                  onChange={(event) => {
                    updateProfileDraft("name", event.target.value);
                    setDisplayName(event.target.value.trim() || "Minha conta");
                  }}
                  required
                  value={profileDraft.name}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Telefone
                <Input
                  name="phone"
                  onChange={(event) => updateProfileDraft("phone", event.target.value)}
                  value={profileDraft.phone}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                CPF
                <Input
                  inputMode="numeric"
                  name="cpf"
                  onChange={(event) => updateProfileDraft("cpf", event.target.value)}
                  value={profileDraft.cpf}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Nascimento
                <Input
                  name="birthday"
                  onChange={(event) => updateProfileDraft("birthday", event.target.value)}
                  type="date"
                  value={profileDraft.birthday}
                />
              </label>
              <Button type={isProfileDirty ? "submit" : "button"} variant={isProfileDirty ? "default" : "outline"}>
                {isProfileDirty ? "Salvar dados" : "Dados salvos"}
              </Button>
            </form>
            <form action={signOutFromCustomer} className="orange-divider pt-4">
              <Button className="w-full" type="submit" variant="destructive">
                Sair da conta
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Acesso e login</CardTitle>
            <CardDescription>Gerencie os metodos de entrada da sua conta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-white p-4 text-sm">
              <div className="grid gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-black">Google</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      isGoogleLinked ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                    }`}>
                      {isGoogleLinked ? "Vinculado" : "Pendente"}
                    </span>
                  </div>
                  <p className="text-pretty text-muted-foreground">
                    {isGoogleLinked
                      ? "Sua conta Google ja pode ser usada para entrar."
                      : "Entre pelo Google sem perder seu historico, pedidos e Nerdcoins."}
                  </p>
                </div>
                {!isGoogleLinked ? (
                  <GoogleSignInButton
                    callbackUrl="/conta?google=linked"
                    className="w-full"
                    label="Vincular Google"
                  />
                ) : null}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Por seguranca, o vinculo so e concluido apos autenticacao no Google.
            </p>
          </CardContent>
        </Card>
        <Card className="border-orange-100 bg-[#fffaf6] shadow-sm">
          <CardHeader>
            <CardTitle>{account.loyaltyPoints?.balance ?? 0} Nerdcoins</CardTitle>
            <CardDescription>Saldo disponível para resgate e cupons pessoais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Tier atual: {account.loyaltyPoints?.tier ?? "GENIN"}</p>
            <Button asChild className="w-full bg-primary text-white hover:bg-primary/90" size="sm" variant="secondary">
              <Link href="/conta/nerdcoins">
                <Coins className="mr-2 size-4" />
                Ver NerdCoins
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/70 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle>Excluir conta</CardTitle>
            <CardDescription>
              Remove definitivamente seu login e dados da conta. Pedidos ficam preservados para histórico da compra.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={deleteOwnCustomerAccount} className="grid gap-3">
              <label className="grid gap-2 text-sm font-medium">
                Digite EXCLUIR para confirmar
                <Input name="confirmDelete" placeholder="EXCLUIR" required />
              </label>
              <Button type="submit" variant="destructive">
                Excluir minha conta definitivamente
              </Button>
            </form>
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
                      <Button size="sm" type="submit" variant="destructive">
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
            {!isAddressFormOpen && addresses.length > 0 ? (
              <Button
                className="w-full border-primary bg-primary text-white hover:bg-primary/90"
                onClick={() => setIsAddressFormOpen(true)}
                type="button"
                variant="secondary"
              >
                <PlusCircle className="mr-2 size-4" />
                Adicionar outro endereço
              </Button>
            ) : null}
            {isAddressFormOpen ? (
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
                <Input
                  name="recipient"
                  onChange={(event) => updateAddressDraft("recipient", event.target.value)}
                  required
                  value={addressDraft.recipient}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                CEP
                <Input
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={9}
                  name="postalCode"
                  onChange={(event) => void lookupPostalCode(event.target.value)}
                  required
                  value={addressDraft.postalCode}
                />
                {postalCodeStatus ? <span className="text-xs text-muted-foreground">{postalCodeStatus}</span> : null}
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Rua
                <Input
                  name="street"
                  onChange={(event) => updateAddressDraft("street", event.target.value)}
                  required
                  value={addressDraft.street}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <label className="grid gap-2 text-sm font-medium">
                  Número
                  <Input
                    name="number"
                    onChange={(event) => updateAddressDraft("number", event.target.value)}
                    required
                    value={addressDraft.number}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Complemento
                  <Input
                    name="complement"
                    onChange={(event) => updateAddressDraft("complement", event.target.value)}
                    value={addressDraft.complement}
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-medium">
                Bairro
                <Input
                  name="district"
                  onChange={(event) => updateAddressDraft("district", event.target.value)}
                  required
                  value={addressDraft.district}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-[1fr_80px]">
                <label className="grid gap-2 text-sm font-medium">
                  Cidade
                  <Input
                    name="city"
                    onChange={(event) => updateAddressDraft("city", event.target.value)}
                    required
                    value={addressDraft.city}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  UF
                  <Input
                    maxLength={2}
                    name="state"
                    onChange={(event) => updateAddressDraft("state", event.target.value.toUpperCase())}
                    required
                    value={addressDraft.state}
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input className="h-4 w-4" name="isDefault" type="checkbox" value="true" />
                Endereço padrão
              </label>
              <Button type="submit">Salvar endereço</Button>
            </form>
            ) : null}
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

      <Card className="overflow-hidden border-orange-100 shadow-sm" id="pedidos">
        <CardHeader className="bg-[#fffaf6]">
          <CardTitle className="flex items-center gap-2 text-balance">
            <PackageCheck className="size-5 text-primary" />
            Meus pedidos
          </CardTitle>
          <CardDescription>Acompanhe suas compras recentes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {account.orders.map((order) => {
              const latestShipment = order.shipments[0];

              return (
                <article
                  key={order.id}
                  className="grid gap-4 rounded-lg border border-orange-100 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <div>
                    <p className="font-semibold text-black">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusPill className={getOrderStatusTone(order.status)} label={formatOrderStatus(order.status)} />
                      <StatusPill
                        className={getPaymentStatusTone(order.paymentStatus)}
                        label={formatPaymentStatus(order.paymentStatus)}
                      />
                    </div>
                  </div>
                  <p className="rounded-lg bg-orange-50 px-3 py-2 text-right font-black text-primary tabular-nums">
                    {formatCurrency(order.totalCents)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {latestShipment ? (
                      <Button asChild className="bg-primary text-white hover:bg-primary/90" size="sm" variant="secondary">
                        <Link href={`/conta/pedidos/${order.id}#rastreamento`}>
                          <Truck className="mr-2 size-4" />
                          Rastrear
                        </Link>
                      </Button>
                    ) : null}
                    <Button asChild className="border-primary/50 bg-white hover:bg-primary/10" size="sm" variant="outline">
                      <Link href={`/conta/pedidos/${order.id}`}>
                        <Eye className="mr-2 size-4" />
                        Ver pedido
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
            {account.orders.length === 0 ? (
              <p className="rounded-lg border border-dashed border-orange-200 bg-orange-50/60 p-4 text-sm text-muted-foreground">
                Você ainda não tem pedidos.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ className, label }: { className: string; label: string }): React.ReactElement {
  return (
    <span className={cn("inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold", className)}>
      {label}
    </span>
  );
}

function formatBirthdayInput(value: Date | null): string {
  return value?.toISOString().slice(0, 10) ?? "";
}
