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

export function CheckoutClient(): React.ReactElement {
  const { items, couponCode, loyaltyPointsToRedeem, clearCart, getValidationPayload } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(formData: FormData): Promise<void> {
    setIsSubmitting(true);
    setMessage(null);

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: getValidationPayload(),
        couponCode,
        loyaltyPointsToRedeem,
        customer: {
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          cpf: formData.get("cpf")
        },
        shippingAddress: {
          recipient: formData.get("name"),
          postalCode: formData.get("postalCode"),
          street: formData.get("street"),
          number: formData.get("number"),
          complement: formData.get("complement"),
          district: formData.get("district"),
          city: formData.get("city"),
          state: formData.get("state"),
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
            <Input name="postalCode" required />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Rua
            <Input name="street" required />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Número
            <Input name="number" required />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Complemento
            <Input name="complement" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Bairro
            <Input name="district" required />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Cidade
            <Input name="city" required />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            UF
            <Input maxLength={2} name="state" required />
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
