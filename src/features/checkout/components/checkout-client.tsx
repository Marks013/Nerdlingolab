"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/features/cart/cart-store";
import { parseFriendlyResponse } from "@/lib/http/friendly-response";

interface CheckoutResponse {
  orderNumber: string;
  checkoutUrl: string | null;
  message?: string;
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

export function CheckoutClient({ savedAddresses = [] }: CheckoutClientProps): React.ReactElement {
  const { clearCart, couponCode, getValidationPayload, items, shippingOptionId, shippingPostalCode } = useCartStore();
  const draftAddress = readDraftCheckoutAddress();
  const addressOptions = savedAddresses.length > 0 ? savedAddresses : draftAddress ? [draftAddress] : [];
  const defaultAddress = addressOptions.find((address) => address.isDefault) ?? addressOptions[0];
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id ?? "");
  const [addressFields, setAddressFields] = useState<AddressFields>(fieldsFromAddress(defaultAddress));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateAddressField(field: keyof AddressFields, value: string): void {
    setAddressFields((currentFields) => ({ ...currentFields, [field]: value }));
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

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: getValidationPayload(),
        couponCode,
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
      setMessage(parsedResponse.message);
      return;
    }

    const payload = parsedResponse.payload;

    clearCart();

    if (payload.checkoutUrl) {
      window.location.assign(payload.checkoutUrl);
      return;
    }

    setMessage(`Pedido ${payload.orderNumber} criado. Aguarde a confirmação do pagamento.`);
  }

  if (items.length === 0) {
    if (message) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Pedido criado</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/produtos">Continuar comprando</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Carrinho vazio</CardTitle>
          <CardDescription>Adicione produtos antes de iniciar o checkout.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/produtos">Ver produtos</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados de entrega</CardTitle>
        <CardDescription>Preencha seus dados para seguir para o pagamento.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {addressOptions.length > 0 ? (
            <fieldset className="grid gap-3 md:col-span-2">
              <legend className="text-sm font-medium">Endereço salvo</legend>
              <div className="grid gap-3">
                {addressOptions.map((address) => (
                  <label
                    className="flex cursor-pointer gap-3 rounded-md border p-3 text-sm"
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
                <label className="flex cursor-pointer gap-3 rounded-md border p-3 text-sm">
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
          <label className="grid gap-2 text-sm font-medium">
            CEP
            <Input
              name="postalCode"
              onChange={(event) => updateAddressField("postalCode", event.target.value)}
              required
              value={addressFields.postalCode}
            />
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
          <Button className="md:col-span-2" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Criando pedido..." : "Pagar com Mercado Pago"}
          </Button>
          {message ? <p className="md:col-span-2 text-sm text-muted-foreground">{message}</p> : null}
        </form>
      </CardContent>
    </Card>
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
