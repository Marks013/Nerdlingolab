"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CartLineItem } from "@/features/cart/components/cart-line-item";
import type { CartValidationResponse } from "@/features/cart/types";
import { useCartStore } from "@/features/cart/cart-store";
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
  const total = validatedCart?.totalCents ?? subtotal;

  if (!hasItems) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seu carrinho está vazio</CardTitle>
          <CardDescription>Adicione produtos para continuar para o checkout.</CardDescription>
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
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Carrinho</CardTitle>
          <CardDescription>Revise os itens escolhidos antes de finalizar a compra.</CardDescription>
        </CardHeader>
        <CardContent>
          {validatedCart?.items.map((item) => (
            <CartLineItem
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

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
          <CardDescription>{validatedCart?.itemCount ?? 0} item(ns)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Input
              id="loyaltyPoints"
              min={0}
              onChange={(event) => setLoyaltyPointsToRedeem(Number(event.target.value))}
              placeholder="0"
              type="number"
              value={loyaltyPointsToRedeem}
            />
            <p className="text-xs text-muted-foreground">
              Disponíveis: {validatedCart?.loyalty.availablePoints ?? 0} ponto(s)
            </p>
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
