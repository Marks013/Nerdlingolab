"use client";

import { useMemo, useState } from "react";

import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { ShippingEstimator } from "@/features/shipping/components/shipping-estimator";
import { formatCurrency } from "@/lib/format";

export interface ProductVariantOption {
  id: string;
  title: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  availableStock: number;
}

interface ProductPurchasePanelProps {
  imageUrl: string | null;
  productId: string;
  productSlug: string;
  productTitle: string;
  variants: ProductVariantOption[];
}

export function ProductPurchasePanel({
  imageUrl,
  productId,
  productSlug,
  productTitle,
  variants
}: ProductPurchasePanelProps): React.ReactElement | null {
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? variants[0],
    [selectedVariantId, variants]
  );

  if (!selectedVariant) {
    return null;
  }

  const hasMultipleVariants = variants.length > 1;
  const hasCompareAtPrice =
    selectedVariant.compareAtPriceCents !== null &&
    selectedVariant.compareAtPriceCents > selectedVariant.priceCents;

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-baseline gap-3">
        <p aria-label="Valor selecionado" className="text-2xl font-semibold text-primary">
          {formatCurrency(selectedVariant.priceCents)}
        </p>
        {hasCompareAtPrice ? (
          <p className="text-sm text-muted-foreground line-through">
            {formatCurrency(selectedVariant.compareAtPriceCents ?? selectedVariant.priceCents)}
          </p>
        ) : null}
      </div>

      {hasMultipleVariants ? (
        <fieldset className="mt-6">
          <legend className="text-sm font-medium">Escolha a opção</legend>
          <div className="mt-3 grid gap-2">
            {variants.map((variant) => {
              const isSelected = variant.id === selectedVariant.id;
              const isUnavailable = variant.availableStock <= 0;

              return (
                <label
                  className="flex cursor-pointer items-start justify-between gap-3 rounded-md border bg-card p-3 text-sm transition has-[:checked]:border-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55"
                  key={variant.id}
                >
                  <span className="flex items-start gap-3">
                    <input
                      checked={isSelected}
                      className="mt-1"
                      disabled={isUnavailable}
                      name="productVariant"
                      onChange={() => setSelectedVariantId(variant.id)}
                      type="radio"
                    />
                    <span>
                      <span className="block font-medium">{variant.title}</span>
                      <span className="mt-1 block text-muted-foreground">
                        {isUnavailable ? "Indisponível" : `${variant.availableStock} unidade(s) disponíveis`}
                      </span>
                    </span>
                  </span>
                  <span className="font-medium">{formatCurrency(variant.priceCents)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {selectedVariant.availableStock > 0
            ? `${selectedVariant.availableStock} unidade(s) disponíveis`
            : "Indisponível"}
        </p>
      )}

      <AddToCartButton
        availableStock={selectedVariant.availableStock}
        item={{
          productId,
          variantId: selectedVariant.id,
          slug: productSlug,
          title: productTitle,
          variantTitle: selectedVariant.title,
          imageUrl,
          unitPriceCents: selectedVariant.priceCents,
          quantity: 1
        }}
        key={selectedVariant.id}
      />

      <ShippingEstimator subtotalCents={selectedVariant.priceCents} />
    </div>
  );
}
