"use client";

import Link from "next/link";
import { ShieldCheck, ShoppingCart, TicketPercent, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CartLineItem } from "@/features/cart/components/cart-line-item";
import type { CartValidationResponse } from "@/features/cart/types";
import { useCartStore } from "@/features/cart/cart-store";
import { FreeShippingProgress } from "@/features/shipping/components/free-shipping-progress";
import { formatCurrency } from "@/lib/format";
import { parseFriendlyResponse } from "@/lib/http/friendly-response";

export function CartClient(): React.ReactElement {
  const { items, removeItem, setQuantity, clearCart, getValidationPayload } = useCartStore();
  const couponCode = useCartStore((state) => state.couponCode);
  const loyaltyPointsToRedeem = useCartStore((state) => state.loyaltyPointsToRedeem);
  const shippingOptionId = useCartStore((state) => state.shippingOptionId);
  const shippingPostalCode = useCartStore((state) => state.shippingPostalCode);
  const setCouponCode = useCartStore((state) => state.setCouponCode);
  const setLoyaltyPointsToRedeem = useCartStore((state) => state.setLoyaltyPointsToRedeem);
  const setShippingOption = useCartStore((state) => state.setShippingOption);
  const setShippingPostalCode = useCartStore((state) => state.setShippingPostalCode);
  const [validatedCart, setValidatedCart] = useState<CartValidationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const shippingPostalCodeRef = useRef(shippingPostalCode);
  const hasItems = items.length > 0;

  const validateCart = useCallback(async (options: { showLoading?: boolean } = {}): Promise<void> => {
    const shouldShowLoading = options.showLoading ?? true;

    if (shouldShowLoading) {
      setIsLoading(true);
    }

    const response = await fetch("/api/cart/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: getValidationPayload(),
        couponCode,
        loyaltyPointsToRedeem,
        shippingOptionId,
        shippingPostalCode: shippingPostalCodeRef.current
      })
    });

    const parsedResponse = await parseFriendlyResponse<CartValidationResponse>(
      response,
      "Não foi possível atualizar o carrinho."
    );

    if (parsedResponse.ok && parsedResponse.payload) {
      setValidatedCart(parsedResponse.payload);
      if (
        parsedResponse.payload.selectedShippingOption &&
        shippingOptionId !== parsedResponse.payload.selectedShippingOption.id
      ) {
        setShippingOption(parsedResponse.payload.selectedShippingOption.id);
      }
      setCartMessage(null);
    } else {
      setCartMessage(parsedResponse.message);
    }

    if (shouldShowLoading) {
      setIsLoading(false);
    }
  }, [
    couponCode,
    getValidationPayload,
    loyaltyPointsToRedeem,
    setShippingOption,
    shippingOptionId,
  ]);

  useEffect(() => {
    if (hasItems) {
      const validationTimeoutId = window.setTimeout(() => {
        void validateCart({ showLoading: false });
      }, 0);

      return () => window.clearTimeout(validationTimeoutId);
    }

    return undefined;
  }, [hasItems, items, validateCart]);

  const subtotal = useMemo(() => validatedCart?.subtotalCents ?? 0, [validatedCart]);
  const couponDiscount = validatedCart?.couponDiscountCents ?? 0;
  const loyaltyDiscount = validatedCart?.loyaltyDiscountCents ?? 0;
  const shipping = validatedCart?.shippingCents ?? 0;
  const freeShippingThresholdCents = validatedCart?.freeShippingThresholdCents ?? 9_990;
  const total = validatedCart?.totalCents ?? subtotal;

  if (!hasItems) {
    return (
      <section className="flex min-h-[620px] items-center justify-center">
        <div className="manga-panel flex min-h-[330px] w-full items-center justify-center rounded-lg bg-white p-10 text-center shadow-sm">
          <div>
            <span className="mx-auto inline-flex h-18 w-18 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShoppingCart className="h-10 w-10 stroke-[1.6]" />
            </span>
            <h1 className="mt-8 text-2xl font-black text-black">Seu carrinho está esperando uma missão.</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#677279]">
              Escolha seus produtos geek favoritos e acompanhe descontos, Nerdcoins e frete grátis em tempo real.
            </p>
            <Button asChild className="mt-7 bg-primary px-9 font-black text-white hover:bg-primary/90">
              <Link href="/produtos">Veja nossos produtos</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="grid gap-5">
        <div className="manga-panel rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase text-primary">Carrinho inteligente</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <CartPerk icon={Truck} label="Frete calculado" />
            <CartPerk icon={TicketPercent} label="Cupons validados" />
            <CartPerk icon={ShieldCheck} label="Checkout seguro" />
          </div>
        </div>

      <Card className="manga-panel">
        <CardHeader>
          <CardTitle>Carrinho</CardTitle>
          <CardDescription>Revise os itens escolhidos antes de finalizar a compra.</CardDescription>
        </CardHeader>
        <CardContent>
          {validatedCart?.items.map((item, itemIndex) => (
            <CartLineItem
              imagePriority={itemIndex === 0}
              item={item}
              key={item.variantId}
              onQuantityChange={setQuantity}
              onRemove={removeItem}
            />
          ))}
          {isLoading ? <p className="py-4 text-sm text-muted-foreground">Validando carrinho...</p> : null}
          {cartMessage ? <p className="py-4 text-sm text-muted-foreground">{cartMessage}</p> : null}
        </CardContent>
      </Card>
      </section>

      <Card className="manga-panel h-fit lg:sticky lg:top-5">
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
          <CardDescription>{validatedCart?.itemCount ?? 0} item(ns)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FreeShippingProgress
            subtotalCents={subtotal}
            thresholdCents={freeShippingThresholdCents}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="couponCode">
              Cupom
            </label>
            <div className="flex gap-2">
              <Input
                id="couponCode"
                onChange={(event) => setCouponCode(event.target.value)}
                placeholder="CUPOM"
                value={couponCode}
              />
              <Button disabled={isLoading} onClick={() => void validateCart({ showLoading: true })} type="button">
                Aplicar
              </Button>
            </div>
            {validatedCart?.couponMessage ? (
              <p className="text-xs text-muted-foreground">{validatedCart.couponMessage}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="shippingPostalCode">
              CEP
            </label>
            <div className="flex gap-2">
              <Input
                id="shippingPostalCode"
                inputMode="numeric"
                onChange={(event) => {
                  shippingPostalCodeRef.current = event.target.value;
                  setShippingPostalCode(event.target.value);
                }}
                placeholder="00000-000"
                value={shippingPostalCode}
              />
              <Button disabled={isLoading} onClick={() => void validateCart({ showLoading: true })} type="button">
                Calcular
              </Button>
            </div>
          </div>

          {validatedCart?.shippingOptions.length ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Entrega</p>
              <div className="grid gap-2">
                {validatedCart.shippingOptions.map((option) => (
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm"
                    key={option.id}
                  >
                    <input
                      checked={(validatedCart.selectedShippingOption?.id ?? "") === option.id}
                      className="mt-1"
                      name="shippingOption"
                      onChange={() => {
                        setShippingOption(option.id);
                        window.setTimeout(() => void validateCart({ showLoading: false }), 0);
                      }}
                      type="radio"
                    />
                    <span className="grid gap-1">
                      <strong>{option.name}</strong>
                      <span className="text-muted-foreground">{option.description}</span>
                      <span>
                        {formatCurrency(option.priceCents)} · {option.estimatedBusinessDays} dia(s) úteis
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="loyaltyPoints">
              Pontos de fidelidade
            </label>
            <div className="flex gap-2">
              <Input
                id="loyaltyPoints"
                max={validatedCart?.loyalty.maxRedeemablePoints ?? undefined}
                min={0}
                onChange={(event) => setLoyaltyPointsToRedeem(Number(event.target.value))}
                placeholder="0"
                type="number"
                value={loyaltyPointsToRedeem}
              />
              <Button
                disabled={!validatedCart?.loyalty.isAvailable || !validatedCart.loyalty.maxRedeemablePoints}
                onClick={() => {
                  setLoyaltyPointsToRedeem(validatedCart?.loyalty.maxRedeemablePoints ?? 0);
                  window.setTimeout(() => void validateCart({ showLoading: false }), 0);
                }}
                type="button"
                variant="outline"
              >
                Máximo
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Disponíveis: {validatedCart?.loyalty.availablePoints ?? 0} · mínimo: {validatedCart?.loyalty.minRedeemPoints ?? 0}
              {validatedCart?.loyalty.maxRedeemablePoints ? ` · máximo neste carrinho: ${validatedCart.loyalty.maxRedeemablePoints}` : ""}
            </p>
            {validatedCart?.loyalty.message ? (
              <p className="text-xs text-muted-foreground">{validatedCart.loyalty.message}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Cupom</span>
            <span>-{formatCurrency(couponDiscount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Pontos</span>
            <span>-{formatCurrency(loyaltyDiscount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Frete</span>
            <span>{formatCurrency(shipping)}</span>
          </div>
          <div className="flex items-center justify-between border-t pt-4 text-base">
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <Button
            aria-disabled={!validatedCart?.items.length || !validatedCart.selectedShippingOption}
            asChild
            className="w-full"
          >
            <Link
              href={validatedCart?.items.length && validatedCart.selectedShippingOption ? "/checkout" : "/carrinho"}
            >
              Continuar para checkout
            </Link>
          </Button>
          <Button className="w-full" onClick={clearCart} type="button" variant="outline">
            Limpar carrinho
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CartPerk({
  icon: Icon,
  label
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}): React.ReactElement {
  return (
    <span className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/15 bg-white px-3 text-sm font-black text-[#344049] shadow-sm">
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </span>
  );
}
