"use client";

import Link from "next/link";
import { CheckCircle2, CreditCard, ExternalLink, MapPin, PackageCheck, ShieldCheck, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/features/cart/cart-store";
import { lookupBrazilianPostalCode, normalizeBrazilianPostalCode } from "@/lib/addresses/brazil";
import { parseFriendlyResponse } from "@/lib/http/friendly-response";
import { formatCpf } from "@/lib/identity/brazil";

interface CheckoutResponse {
  orderId: string;
  orderNumber: string;
  checkoutUrl: string | null;
  message?: string;
}

interface CreatedCheckoutSummary {
  checkoutUrl: string | null;
  orderId: string;
}

export interface CheckoutSavedAddress {
  id: string;
  label: string | null;
  recipient: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  country: string;
  isDefault: boolean;
}

export interface CheckoutCustomerProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  cpf: string | null;
}

interface AddressFields {
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
}

interface CheckoutClientProps {
  customerProfile?: CheckoutCustomerProfile | null;
  savedAddresses?: CheckoutSavedAddress[];
}

function fieldsFromAddress(address?: CheckoutSavedAddress): AddressFields {
  return {
    postalCode: address?.postalCode ?? "",
    street: address?.street ?? "",
    number: address?.number ?? "",
    complement: address?.complement ?? "",
    district: address?.district ?? "",
    city: address?.city ?? "",
    state: address?.state ?? ""
  };
}

export function CheckoutClient({
  customerProfile = null,
  savedAddresses = []
}: CheckoutClientProps): React.ReactElement {
  const { clearCart, couponCode, getValidationPayload, items, shippingOptionId, shippingPostalCode } = useCartStore();
  const draftAddress = readDraftCheckoutAddress();
  const addressOptions = savedAddresses.length > 0 ? savedAddresses : draftAddress ? [draftAddress] : [];
  const defaultAddress = addressOptions.find((address) => address.isDefault) ?? addressOptions[0];
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id ?? "");
  const [addressFields, setAddressFields] = useState<AddressFields>(fieldsFromAddress(defaultAddress));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [postalCodeStatus, setPostalCodeStatus] = useState<string | null>(null);
  const [createdCheckout, setCreatedCheckout] = useState<CreatedCheckoutSummary | null>(null);
  const isManualAddress = addressOptions.length === 0 || !selectedAddressId;
  const customerName = customerProfile?.name ?? "";
  const customerEmail = customerProfile?.email ?? "";
  const customerPhone = customerProfile?.phone ?? "";
  const customerCpf = customerProfile?.cpf ?? "";

  function updateAddressField(field: keyof AddressFields, value: string): void {
    setAddressFields((currentFields) => ({ ...currentFields, [field]: value }));
  }

  async function lookupPostalCode(value: string): Promise<void> {
    const postalCode = normalizeBrazilianPostalCode(value);
    updateAddressField("postalCode", postalCode);

    if (postalCode.length !== 8) {
      setPostalCodeStatus(postalCode.length > 0 ? "Digite os 8 números do CEP." : null);
      return;
    }

    setPostalCodeStatus("Buscando endereço...");

    const result = await lookupBrazilianPostalCode(postalCode);

    if (!result.ok || !result.address) {
      setPostalCodeStatus(result.message ?? "CEP não encontrado. Confira antes de pagar.");
      return;
    }

    setAddressFields((currentFields) => ({
      ...currentFields,
      city: result.address?.city ?? currentFields.city,
      complement: currentFields.complement || result.address?.complement || "",
      district: result.address?.district ?? currentFields.district,
      postalCode,
      state: result.address?.state ?? currentFields.state,
      street: result.address?.street ?? currentFields.street
    }));
    setPostalCodeStatus("Endereço preenchido pelo CEP. Confira o número antes de pagar.");
  }

  function selectSavedAddress(addressId: string): void {
    setSelectedAddressId(addressId);

    const address = addressOptions.find((savedAddress) => savedAddress.id === addressId);
    setAddressFields(fieldsFromAddress(address));
  }

  function useManualAddress(): void {
    setSelectedAddressId("");
    setAddressFields((currentFields) => ({
      ...currentFields,
      postalCode: currentFields.postalCode || shippingPostalCode
    }));
  }

  async function handleSubmit(formData: FormData): Promise<void> {
    setIsSubmitting(true);
    setMessage(null);
    setCreatedCheckout(null);

    const mercadoPagoWindow = typeof window !== "undefined"
      ? window.open("about:blank", "nerdlingolab-mercado-pago")
      : null;

    if (mercadoPagoWindow) {
      mercadoPagoWindow.opener = null;
    }

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: getValidationPayload(),
        couponCode,
        customerNote: formData.get("customerNote"),
        shippingOptionId,
        savedAddressId: selectedAddressId || undefined,
        customer: {
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          cpf: formData.get("cpf")
        },
        shippingAddress: {
          recipient: formData.get("name"),
          postalCode: addressFields.postalCode || shippingPostalCode,
          street: addressFields.street,
          number: addressFields.number,
          complement: addressFields.complement,
          district: addressFields.district,
          city: addressFields.city,
          state: addressFields.state,
          country: "BR"
        }
      })
    });
    const parsedResponse = await parseFriendlyResponse<CheckoutResponse>(
      response,
      "Não foi possível iniciar o checkout. Tente novamente em alguns instantes."
    );

    setIsSubmitting(false);

    if (!parsedResponse.ok || !parsedResponse.payload) {
      mercadoPagoWindow?.close();
      setMessage(parsedResponse.message);
      return;
    }

    const payload = parsedResponse.payload;

    clearCart();
    setCreatedCheckout({
      checkoutUrl: payload.checkoutUrl,
      orderId: payload.orderId
    });

    if (payload.checkoutUrl) {
      if (mercadoPagoWindow && !mercadoPagoWindow.closed) {
        mercadoPagoWindow.location.href = payload.checkoutUrl;
        setMessage(
          `Pedido ${payload.orderNumber} criado. Abrimos o Mercado Pago em uma nova aba; se a tela Pix não voltar sozinha, acompanhe a confirmação por aqui.`
        );
        return;
      }

      window.location.assign(payload.checkoutUrl);
      return;
    }

    mercadoPagoWindow?.close();
    setMessage(`Pedido ${payload.orderNumber} criado. Aguarde a confirmação do pagamento.`);
  }

  if (items.length === 0) {
    if (message) {
      return (
        <Card className="overflow-hidden border-emerald-200 shadow-sm">
          <CardHeader className="bg-emerald-50 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700">
              <CheckCircle2 className="size-7" />
            </span>
            <CardTitle className="mt-3 text-balance text-2xl font-black text-emerald-900">Pedido criado</CardTitle>
            <CardDescription className="text-pretty text-emerald-800">{message}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-center gap-3 p-6 sm:flex-row">
            {createdCheckout?.checkoutUrl ? (
              <Button asChild className="bg-primary text-white hover:bg-primary/90">
                <a href={createdCheckout.checkoutUrl} rel="noreferrer" target="_blank">
                  <ExternalLink className="mr-2 size-4" />
                  Abrir Mercado Pago
                </a>
              </Button>
            ) : null}
            {createdCheckout?.orderId ? (
              <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Link href={`/conta/pedidos/${createdCheckout.orderId}`}>Ver pedido</Link>
              </Button>
            ) : null}
            <Button asChild className="bg-orange-600 text-white hover:bg-orange-700">
              <Link href="/produtos">Continuar comprando</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="overflow-hidden border-orange-100 shadow-sm">
        <CardHeader className="bg-[#fffaf6] text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full border border-primary/20 bg-white text-primary">
            <ShoppingBag className="size-7" />
          </span>
          <CardTitle className="mt-3 text-balance text-2xl font-black text-black">Carrinho vazio</CardTitle>
          <CardDescription className="text-pretty">Adicione produtos antes de iniciar o checkout.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-6">
          <Button asChild className="bg-primary text-white hover:bg-primary/90">
            <Link href="/produtos">Ver produtos</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-orange-100 shadow-sm">
      <CardHeader className="bg-[#fffaf6]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-balance text-2xl font-black text-black">
              <PackageCheck className="size-6 text-primary" />
              Dados de entrega
            </CardTitle>
            <CardDescription className="mt-2 text-pretty">
              Confirme entrega, dados do pedido e siga para o ambiente protegido do Mercado Pago.
            </CardDescription>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3 lg:w-[430px]">
            <CheckoutTrustBadge icon={MapPin} text="Entrega conferida" />
            <CheckoutTrustBadge icon={ShieldCheck} text="Compra protegida" />
            <CheckoutTrustBadge icon={CreditCard} text="Mercado Pago" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {addressOptions.length > 0 ? (
            <fieldset className="grid gap-3 md:col-span-2">
              <legend className="text-sm font-medium">Endereço salvo</legend>
              <div className="grid gap-3">
                {addressOptions.map((address) => (
                  <label
                    className="flex cursor-pointer gap-3 rounded-lg border border-orange-100 bg-white p-3 text-sm shadow-sm transition hover:border-primary/50 hover:bg-orange-50/50"
                    key={address.id}
                  >
                    <input
                      checked={selectedAddressId === address.id}
                      className="mt-1 h-4 w-4"
                      name="savedAddress"
                      onChange={() => selectSavedAddress(address.id)}
                      type="radio"
                      value={address.id}
                    />
                    <span>
                      <span className="block font-medium">
                        {address.label || address.recipient}
                        {address.isDefault ? " · padrão" : ""}
                      </span>
                      <span className="block text-muted-foreground">
                        {address.street}, {address.number} · {address.city} - {address.state}
                      </span>
                    </span>
                  </label>
                ))}
                <label className="flex cursor-pointer gap-3 rounded-lg border border-orange-100 bg-white p-3 text-sm shadow-sm transition hover:border-primary/50 hover:bg-orange-50/50">
                  <input
                    checked={!selectedAddressId}
                    className="mt-1 h-4 w-4"
                    name="savedAddress"
                    onChange={useManualAddress}
                    type="radio"
                    value=""
                  />
                  <span className="font-medium">Usar outro endereço</span>
                </label>
              </div>
            </fieldset>
          ) : null}
          {customerProfile ? (
            <div className="rounded-lg border border-orange-100 bg-[#fffaf6] p-4 text-sm md:col-span-2">
              <p className="font-black text-black">Dados da conta</p>
              <p className="mt-2 text-[#4f5d65]">
                {customerName} · {customerEmail}
              </p>
              <p className="mt-1 text-[#4f5d65]">
                {customerCpf ? `CPF ${formatCpf(customerCpf)}` : "CPF pendente"}
                {customerPhone ? ` · ${customerPhone}` : ""}
              </p>
              <p className="mt-3 text-xs text-[#677279]">
                Esses dados vêm da sua conta e serão usados no pedido e no pagamento.
              </p>
              <input name="name" type="hidden" value={customerName} />
              <input name="email" type="hidden" value={customerEmail} />
              <input name="phone" type="hidden" value={customerPhone} />
              <input name="cpf" type="hidden" value={customerCpf} />
            </div>
          ) : (
            <>
              <label className="grid gap-2 text-sm font-medium">
                Nome completo
                <Input name="name" required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                E-mail
                <Input name="email" required type="email" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Telefone
                <Input name="phone" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                CPF
                <Input name="cpf" />
              </label>
            </>
          )}
          {isManualAddress ? (
            <>
          <label className="grid gap-2 text-sm font-medium">
            CEP
            <Input
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={9}
              name="postalCode"
              onChange={(event) => void lookupPostalCode(event.target.value)}
              required
              value={addressFields.postalCode}
            />
            {postalCodeStatus ? <span className="text-xs font-normal text-muted-foreground">{postalCodeStatus}</span> : null}
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Rua
            <Input
              name="street"
              onChange={(event) => updateAddressField("street", event.target.value)}
              required
              value={addressFields.street}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Número
            <Input
              name="number"
              onChange={(event) => updateAddressField("number", event.target.value)}
              required
              value={addressFields.number}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Complemento
            <Input
              name="complement"
              onChange={(event) => updateAddressField("complement", event.target.value)}
              value={addressFields.complement}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Bairro
            <Input
              name="district"
              onChange={(event) => updateAddressField("district", event.target.value)}
              required
              value={addressFields.district}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Cidade
            <Input
              name="city"
              onChange={(event) => updateAddressField("city", event.target.value)}
              required
              value={addressFields.city}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            UF
            <Input
              maxLength={2}
              name="state"
              onChange={(event) => updateAddressField("state", event.target.value.toUpperCase())}
              required
              value={addressFields.state}
            />
          </label>
            </>
          ) : null}
          <label className="grid gap-2 text-sm font-medium md:col-span-2">
            Observação do pedido
            <textarea
              className="min-h-28 resize-y rounded-md border border-orange-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              maxLength={1000}
              name="customerNote"
              placeholder="Ex.: instruções para entrega, preferência de contato ou alguma observação sobre o pedido."
            />
            <span className="text-xs font-normal text-muted-foreground">
              Opcional. Evite informar dados sensíveis como senhas ou dados de cartão.
            </span>
          </label>
          <Button className="h-12 bg-emerald-600 text-base font-black text-white hover:bg-emerald-700 md:col-span-2" disabled={isSubmitting} type="submit">
            <CreditCard className="mr-2 size-5" />
            {isSubmitting ? "Criando pedido..." : "Pagar com Mercado Pago"}
          </Button>
          {message ? (
            <p className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900 md:col-span-2">
              {message}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function CheckoutTrustBadge({
  icon: Icon,
  text
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}): React.ReactElement {
  return (
    <span className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-100 bg-white px-3 py-2 font-bold text-[#3a2a1c] shadow-sm">
      <Icon className="size-4 text-primary" />
      {text}
    </span>
  );
}

function readDraftCheckoutAddress(): CheckoutSavedAddress | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const draft = JSON.parse(
      window.sessionStorage.getItem("nerdlingolab:draft-checkout-address") ??
        window.localStorage.getItem("nerdlingolab:draft-checkout-address") ??
        "null"
    ) as Partial<CheckoutSavedAddress> | null;

    if (!draft?.postalCode || !draft.street || !draft.number || !draft.district || !draft.city || !draft.state) {
      return null;
    }

    return {
      id: "draft-address",
      label: draft.label ?? null,
      recipient: draft.recipient ?? "Cliente",
      postalCode: draft.postalCode,
      street: draft.street,
      number: draft.number,
      complement: draft.complement ?? null,
      district: draft.district,
      city: draft.city,
      state: draft.state,
      country: "BR",
      isDefault: true
    };
  } catch {
    return null;
  }
}
