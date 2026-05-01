"use client";

import { BadgePercent, ChevronDown, CreditCard, Heart, MessageCircle, Minus, Plus, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import { PaymentBadge, PaymentBadgeStrip, pixPaymentMethod } from "@/components/shop/payment-badges";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { ShippingEstimator } from "@/features/shipping/components/shipping-estimator";
import { formatCurrency } from "@/lib/format";
import {
  calculateInstallments,
  calculatePixPriceCents,
  type PaymentTerms
} from "@/lib/payments/installments";

export interface ProductVariantOption {
  availableStock: number;
  compareAtPriceCents: number | null;
  heightCm?: number | null;
  id: string;
  imageUrl?: string | null;
  lengthCm?: number | null;
  optionValues: unknown;
  priceCents: number;
  shippingLeadTimeDays?: number | null;
  title: string;
  weightGrams?: number | null;
  widthCm?: number | null;
}

interface ProductPurchasePanelProps {
  freeShippingThresholdCents: number;
  imageUrl: string | null;
  onVariantSelect?: (variantId: string) => void;
  paymentTerms: PaymentTerms;
  productId: string;
  productSlug: string;
  productTitle: string;
  productUrl: string;
  selectedVariantId?: string;
  variants: ProductVariantOption[];
}

export function ProductPurchasePanel({
  freeShippingThresholdCents,
  imageUrl,
  onVariantSelect,
  paymentTerms,
  productId,
  productSlug,
  productTitle,
  productUrl,
  selectedVariantId: controlledSelectedVariantId,
  variants
}: ProductPurchasePanelProps): React.ReactElement | null {
  const [localSelectedVariantId, setLocalSelectedVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const selectedVariantId = controlledSelectedVariantId ?? localSelectedVariantId;
  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? variants[0],
    [selectedVariantId, variants]
  );

  if (!selectedVariant) {
    return null;
  }

  const hasCompareAtPrice =
    selectedVariant.compareAtPriceCents !== null &&
    selectedVariant.compareAtPriceCents > selectedVariant.priceCents;
  const pixPriceCents = calculatePixPriceCents(selectedVariant.priceCents, paymentTerms.pixDiscountBps);
  const installmentPreview = calculateInstallments({
    maxInstallments: paymentTerms.maxInstallments,
    monthlyRateBps: paymentTerms.cardInstallmentMonthlyRateBps,
    priceCents: selectedVariant.priceCents
  }).at(-1);
  const subtotalCents = selectedVariant.priceCents * quantity;
  const whatsappHref = buildProductWhatsappHref({
    color: getVariantColor(selectedVariant),
    gender: getVariantGender(selectedVariant),
    productTitle,
    productUrl,
    quantity,
    size: getVariantSize(selectedVariant),
    variantTitle: selectedVariant.title
  });
  const handleVariantSelect = (variantId: string) => {
    setLocalSelectedVariantId(variantId);
    onVariantSelect?.(variantId);
  };

  return (
    <div className="mt-7 border-t pt-7">
      <VariantSelector
        selectedVariantId={selectedVariant.id}
        variants={variants}
        onSelect={handleVariantSelect}
      />

      <div className="mt-8">
        <p aria-label="Valor selecionado" className="text-4xl font-black text-primary">
          {formatCurrency(selectedVariant.priceCents)}
        </p>
        {hasCompareAtPrice ? (
          <p className="mt-1 text-sm text-[#677279] line-through">
            {formatCurrency(selectedVariant.compareAtPriceCents ?? selectedVariant.priceCents)}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-[#677279]">
          ou até {paymentTerms.maxInstallments}x de {formatCurrency(installmentPreview?.valueCents ?? selectedVariant.priceCents)}
        </p>
        <PaymentInstallmentPanel
          paymentTerms={paymentTerms}
          priceCents={selectedVariant.priceCents}
          pixPriceCents={pixPriceCents}
        />
      </div>

      <div className="mt-7 flex items-center gap-4">
        <span className="text-sm font-black text-[#3a2a1c]">Quantidade</span>
        <div className="inline-flex h-11 overflow-hidden rounded-xl border-2 border-primary/70 bg-[#fff7ed] shadow-[0_8px_18px_rgba(255,102,0,0.16)]">
          <button
            className="flex w-12 items-center justify-center bg-[#fff0e3] text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={quantity <= 1}
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            type="button"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="flex w-14 items-center justify-center border-x-2 border-primary/30 bg-white text-base font-black text-[#1c1c1c]">
            {quantity}
          </span>
          <button
            className="flex w-12 items-center justify-center bg-[#fff0e3] text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={quantity >= selectedVariant.availableStock}
            onClick={() => setQuantity(Math.min(selectedVariant.availableStock, quantity + 1))}
            type="button"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
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
            quantity
          }}
          key={`${selectedVariant.id}-${quantity}`}
        />
        <a
          className="inline-flex h-12 items-center justify-center rounded-lg bg-[#b85415] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#a14912]"
          href="/checkout"
        >
          <Zap className="mr-2 h-4 w-4" />
          Comprar Agora
        </a>
      </div>

      <a
        className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-lg border border-[#9ee8c1] bg-[#f2fff8] px-4 text-sm font-black text-[#168a4d]"
        href={whatsappHref}
        rel="noreferrer"
        target="_blank"
      >
        <MessageCircle className="mr-2 h-5 w-5" />
        Comprar pelo whatsapp
      </a>

      <button
        className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-lg border border-black bg-white px-4 text-sm text-red-600"
        type="button"
      >
        <Heart className="mr-2 h-5 w-5 fill-black text-black" />
        Adicionar à lista de desejos
      </button>

      <ShippingEstimator
        freeShippingThresholdCents={freeShippingThresholdCents}
        item={{
          heightCm: selectedVariant.heightCm,
          id: selectedVariant.id,
          lengthCm: selectedVariant.lengthCm,
          quantity,
          shippingLeadTimeDays: selectedVariant.shippingLeadTimeDays,
          unitPriceCents: selectedVariant.priceCents,
          weightGrams: selectedVariant.weightGrams,
          widthCm: selectedVariant.widthCm
        }}
        subtotalCents={subtotalCents}
      />
    </div>
  );
}

function PaymentInstallmentPanel({
  paymentTerms,
  pixPriceCents,
  priceCents
}: {
  paymentTerms: PaymentTerms;
  pixPriceCents: number;
  priceCents: number;
}): React.ReactElement {
  const installments = calculateInstallments({
    maxInstallments: paymentTerms.maxInstallments,
    monthlyRateBps: paymentTerms.cardInstallmentMonthlyRateBps,
    priceCents
  });
  const hasCardRate = paymentTerms.cardInstallmentMonthlyRateBps > 0;
  const pixDiscountPercent = paymentTerms.pixDiscountBps / 100;

  return (
    <div className="mt-4 space-y-3">
      <div className="overflow-hidden rounded-lg border border-primary/15 bg-white shadow-sm">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <span className="flex min-w-0 items-center gap-2 text-sm font-black text-[#1c1c1c]">
              <CreditCard className="h-4 w-4 text-primary" />
              mais formas de pagamento
            </span>
            <span className="flex items-center gap-2 text-xs font-semibold text-[#677279]">
              Parcelas
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </span>
          </summary>
          <div className="border-t border-primary/10 px-4 py-4">
            <PaymentBadgeStrip compact includePix={false} />
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-[#4f5d65]">
              {installments.map(({ installment, totalCents, valueCents }) => (
                <p key={installment}>
                  {installment}x de {formatCurrency(valueCents)}
                  {hasCardRate && installment > 1 ? (
                    <span className="block text-xs text-[#677279]">total {formatCurrency(totalCents)}</span>
                  ) : null}
                </p>
              ))}
            </div>
            {hasCardRate || paymentTerms.paymentFeeSource === "MERCADO_PAGO" ? (
              <p className="mt-3 text-xs text-[#677279]">
                Juros configurados no admin: {(paymentTerms.cardInstallmentMonthlyRateBps / 100).toLocaleString("pt-BR", {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 0
                })}% ao mês
                {paymentTerms.paymentFeeSource === "MERCADO_PAGO" ? " como referência do Mercado Pago." : "."}
              </p>
            ) : null}
          </div>
        </details>
      </div>

      <div className="rounded-xl border border-[#32bcad]/50 bg-gradient-to-r from-[#eafffb] via-white to-[#fff7ed] p-3 shadow-[0_12px_28px_rgba(50,188,173,0.16)]">
        <div className="flex items-center gap-3">
          <PaymentBadge compact method={pixPaymentMethod} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xl font-black text-[#12312d]">
                {formatCurrency(pixPriceCents)} <span className="text-sm font-bold text-[#278b7f]">no Pix</span>
              </p>
              {pixDiscountPercent > 0 ? (
                <span className="inline-flex items-center rounded-full bg-[#32bcad] px-2.5 py-1 text-xs font-black text-white">
                  <BadgePercent className="mr-1 h-3.5 w-3.5" />
                  {pixDiscountPercent.toLocaleString("pt-BR")}% OFF
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm font-semibold text-[#45615d]">
              Pague com Pix e economize {formatCurrency(priceCents - pixPriceCents)}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariantSelector({
  onSelect,
  selectedVariantId,
  variants
}: {
  onSelect: (variantId: string) => void;
  selectedVariantId: string;
  variants: ProductVariantOption[];
}): React.ReactElement {
  const hasStructuredOptions = variants.some(
    (variant) => getVariantGender(variant) || getVariantColor(variant) || getVariantSize(variant)
  );
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];

  if (hasStructuredOptions && selectedVariant) {
    const selectedGender = getVariantGender(selectedVariant);
    const selectedColor = getVariantColor(selectedVariant);
    const selectedSize = getVariantSize(selectedVariant);
    const genders = unique(variants.map(getVariantGender).filter((gender): gender is string => Boolean(gender)))
      .sort(compareGenderOptions);
    const shouldShowGenderOptions = genders.length > 1;
    const activeGenderFilter = shouldShowGenderOptions ? selectedGender : null;
    const colors = unique(
      variants
        .filter((variant) => !activeGenderFilter || getVariantGender(variant) === activeGenderFilter)
        .map(getVariantColor)
        .filter((color): color is string => Boolean(color))
    );
    const sizes = unique(
      variants
        .filter((variant) => (!activeGenderFilter || getVariantGender(variant) === activeGenderFilter)
          && (!selectedColor || getVariantColor(variant) === selectedColor))
        .map(getVariantSize)
        .filter((size): size is string => Boolean(size))
    ).sort(compareSizeOptions);

    return (
      <fieldset>
        {shouldShowGenderOptions ? (
          <div>
            <legend className="text-base font-semibold text-black">Genero: {selectedGender ?? "Selecione"}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {genders.map((gender) => {
                const genderVariant = getBestVariantForSelection(variants, {
                  color: selectedColor,
                  gender,
                  size: selectedSize
                });
                const isSelected = gender === selectedGender;
                const isUnavailable = !variants.some(
                  (variant) => getVariantGender(variant) === gender && variant.availableStock > 0
                );

                return (
                  <button
                    aria-pressed={isSelected}
                    className={[
                      "inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold transition",
                      isSelected ? "border-primary bg-[#fff7f2] text-primary" : "border-[#d9e0e4] bg-white text-[#344049]",
                      isUnavailable ? "cursor-not-allowed opacity-50" : "hover:border-primary"
                    ].join(" ")}
                    disabled={!genderVariant || isUnavailable}
                    key={gender}
                    onClick={() => genderVariant && onSelect(genderVariant.id)}
                    type="button"
                  >
                    {formatOptionName(gender)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {colors.length > 0 ? (
          <div className={shouldShowGenderOptions ? "mt-5" : ""}>
            <legend className="text-base font-semibold text-black">Cor: {selectedColor ?? "Selecione"}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {colors.map((color) => {
                const colorVariant = getBestVariantForColor(variants, {
                  color,
                  gender: activeGenderFilter,
                  size: selectedSize
                });
                const isSelected = color === selectedColor;
                const isUnavailable = !variants.some(
                  (variant) => getVariantColor(variant) === color
                    && (!activeGenderFilter || getVariantGender(variant) === activeGenderFilter)
                    && variant.availableStock > 0
                );

                return (
                  <button
                    aria-pressed={isSelected}
                    className={[
                      "inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold transition",
                      isSelected ? "border-primary bg-[#fff7f2] text-primary" : "border-[#d9e0e4] bg-white text-[#344049]",
                      isUnavailable ? "cursor-not-allowed opacity-50" : "hover:border-primary"
                    ].join(" ")}
                    disabled={!colorVariant || isUnavailable}
                    key={color}
                    onClick={() => colorVariant && onSelect(colorVariant.id)}
                    type="button"
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/15"
                      style={{ backgroundColor: getColorSwatch(color) }}
                    />
                    {formatOptionName(color)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {sizes.length > 0 ? (
          <div className={colors.length > 0 || shouldShowGenderOptions ? "mt-5" : ""}>
            <p className="text-base font-semibold text-black">Tamanho</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sizes.map((size) => {
                const sizeVariant = getBestVariantForSelection(variants, {
                  color: selectedColor,
                  gender: activeGenderFilter,
                  size
                });
                const isSelected = size === selectedSize;
                const isUnavailable = !variants.some(
                  (variant) => getVariantSize(variant) === size
                    && (!activeGenderFilter || getVariantGender(variant) === activeGenderFilter)
                    && (!selectedColor || getVariantColor(variant) === selectedColor)
                    && variant.availableStock > 0
                );

                return (
                  <button
                    aria-pressed={isSelected}
                    className={[
                      "inline-flex min-h-10 min-w-12 items-center justify-center rounded-lg border px-3 text-sm font-bold transition",
                      isSelected ? "border-primary bg-[#fff7f2] text-primary" : "border-[#d9e0e4] bg-white text-[#344049]",
                      isUnavailable ? "cursor-not-allowed opacity-50" : "hover:border-primary"
                    ].join(" ")}
                    disabled={!sizeVariant || isUnavailable}
                    key={size}
                    onClick={() => sizeVariant && onSelect(sizeVariant.id)}
                    type="button"
                  >
                    {formatOptionName(size)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </fieldset>
    );
  }

  return (
    <fieldset>
      <legend className="text-base text-black">Opção:</legend>
      <div className="mt-3 flex flex-wrap gap-3">
        {variants.map((variant) => {
          const isSelected = variant.id === selectedVariantId;
          const isUnavailable = variant.availableStock <= 0;

          return (
            <label
              className={isUnavailable ? "cursor-not-allowed" : "cursor-pointer"}
              key={variant.id}
            >
              <input
                checked={isSelected}
                className="mr-2 h-4 w-4 accent-primary"
                disabled={isUnavailable}
                name="variantId"
                onChange={() => onSelect(variant.id)}
                type="radio"
                value={variant.id}
              />
              <span
                className={[
                  "inline-flex min-h-12 items-center rounded-lg border px-4 text-sm font-medium transition",
                  isSelected ? "border-primary bg-[#fff7f2] text-primary" : "border-[#e8e8e8] bg-white text-[#677279]",
                  isUnavailable ? "cursor-not-allowed opacity-50" : "hover:border-primary"
                ].join(" ")}
              >
                {formatVariantLabel(variant)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function buildProductWhatsappHref({
  color,
  gender,
  productTitle,
  productUrl,
  quantity,
  size,
  variantTitle
}: {
  color: string | null;
  gender: string | null;
  productTitle: string;
  productUrl: string;
  quantity: number;
  size: string | null;
  variantTitle: string;
}): string {
  const optionLines = [
    gender ? `Genero: ${formatOptionName(gender)}` : null,
    color ? `Cor: ${formatOptionName(color)}` : null,
    size ? `Tamanho: ${formatOptionName(size)}` : null,
    `Quantidade: ${quantity}`,
    variantTitle ? `Variacao selecionada: ${variantTitle}` : null
  ].filter(Boolean);
  const message = [
    "Ola! Tenho interesse em comprar este produto da NerdLingoLab:",
    productTitle,
    ...optionLines,
    `Link: ${productUrl}`
  ].join("\n");

  return `https://wa.me/5544991362488?text=${encodeURIComponent(message)}`;
}

function formatVariantLabel(variant: ProductVariantOption): string {
  if (!variant.optionValues || typeof variant.optionValues !== "object" || Array.isArray(variant.optionValues)) {
    return variant.title;
  }

  const values = Object.values(variant.optionValues as Record<string, unknown>)
    .filter((value, index) => !Object.keys(variant.optionValues as Record<string, unknown>)[index].startsWith("_"))
    .map((value) => String(value))
    .filter(Boolean);

  return values.length > 0 ? values.join(" / ") : variant.title;
}

const sizeOrder = ["PP", "P", "M", "G", "GG", "XG"];
const sizeValues = new Set(sizeOrder.map(normalizeOptionValue));
const genderValues = new Set(["feminino", "feminina", "mulher", "masculino", "masculina", "homem", "unissex"]);
const colorValues = new Set([
  "amarelo",
  "azul",
  "bege",
  "branco",
  "caqui",
  "cinza",
  "creme",
  "laranja",
  "marrom",
  "off white",
  "preto",
  "rosa",
  "roxo",
  "verde",
  "vermelho",
  "vinho"
]);

function getVariantGender(variant: ProductVariantOption): string | null {
  return getSemanticOptionValue(variant, isGenderValue)
    ?? getOptionValueByKeys(variant, ["Genero", "Gênero", "Gender", "Sexo", "Modelo"], [isColorValue, isSizeValue]);
}

function getVariantColor(variant: ProductVariantOption): string | null {
  return getSemanticOptionValue(variant, isColorValue)
    ?? getOptionValueByKeys(variant, ["Cor", "Color", "Colour"], [isGenderValue, isSizeValue]);
}

function getVariantSize(variant: ProductVariantOption): string | null {
  return getSemanticOptionValue(variant, isSizeValue)
    ?? getOptionValueByKeys(variant, ["Tamanho", "Size", "Tam"], [isGenderValue, isColorValue]);
}

function getSemanticOptionValue(
  variant: ProductVariantOption,
  predicate: (value: string) => boolean
): string | null {
  return getOptionEntries(variant)
    .map(([, value]) => value)
    .find(predicate) ?? null;
}

function getOptionValueByKeys(
  variant: ProductVariantOption,
  keys: string[],
  disallowedPredicates: Array<(value: string) => boolean>
): string | null {
  const normalizedKeys = new Set(keys.map(normalizeOptionKey));
  const entry = getOptionEntries(variant).find(([optionKey, value]) => {
    if (!normalizedKeys.has(normalizeOptionKey(optionKey))) {
      return false;
    }

    return !disallowedPredicates.some((predicate) => predicate(value));
  });

  return entry?.[1] ?? null;
}

function getOptionEntries(variant: ProductVariantOption): Array<[string, string]> {
  if (!variant.optionValues || typeof variant.optionValues !== "object" || Array.isArray(variant.optionValues)) {
    return [];
  }

  return Object.entries(variant.optionValues as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
    .map(([key, value]) => [key, value.trim()]);
}

function getBestVariantForSelection(
  variants: ProductVariantOption[],
  selection: {
    color?: string | null;
    gender?: string | null;
    size?: string | null;
  }
): ProductVariantOption | undefined {
  const exactVariants = variants.filter((variant) => matchesVariantSelection(variant, selection));

  return (
    exactVariants.find((variant) => variant.availableStock > 0) ??
    exactVariants[0] ??
    variants.find((variant) => matchesVariantSelection(variant, { color: selection.color, gender: selection.gender }) && variant.availableStock > 0) ??
    variants.find((variant) => matchesVariantSelection(variant, { color: selection.color, size: selection.size }) && variant.availableStock > 0) ??
    variants.find((variant) => matchesVariantSelection(variant, { gender: selection.gender, size: selection.size }) && variant.availableStock > 0) ??
    variants.find((variant) => variant.availableStock > 0) ??
    variants[0]
  );
}

function getBestVariantForColor(
  variants: ProductVariantOption[],
  selection: {
    color?: string | null;
    gender?: string | null;
    size?: string | null;
  }
): ProductVariantOption | undefined {
  return getBestVariantForSelection(variants, selection);
}

function matchesVariantSelection(
  variant: ProductVariantOption,
  selection: {
    color?: string | null;
    gender?: string | null;
    size?: string | null;
  }
): boolean {
  return (!selection.gender || getVariantGender(variant) === selection.gender)
    && (!selection.color || getVariantColor(variant) === selection.color)
    && (!selection.size || getVariantSize(variant) === selection.size);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function compareGenderOptions(left: string, right: string): number {
  const order = ["feminino", "feminina", "mulher", "masculino", "masculina", "homem", "unissex"];

  return getOptionOrder(left, order) - getOptionOrder(right, order)
    || left.localeCompare(right, "pt-BR");
}

function compareSizeOptions(left: string, right: string): number {
  return getOptionOrder(left, sizeOrder) - getOptionOrder(right, sizeOrder)
    || left.localeCompare(right, "pt-BR", { numeric: true });
}

function getOptionOrder(value: string, order: string[]): number {
  const normalizedValue = normalizeOptionValue(value);
  const normalizedOrder = order.map(normalizeOptionValue);
  const index = normalizedOrder.indexOf(normalizedValue);

  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function normalizeOptionKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeOptionValue(value: string): string {
  return normalizeOptionKey(value).replace(/\s+/g, " ");
}

function isGenderValue(value: string): boolean {
  return genderValues.has(normalizeOptionValue(value));
}

function isColorValue(value: string): boolean {
  return colorValues.has(normalizeOptionValue(value));
}

function isSizeValue(value: string): boolean {
  return sizeValues.has(normalizeOptionValue(value));
}

function formatOptionName(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getColorSwatch(color: string): string {
  const normalizedColor = color.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const colorMap: Record<string, string> = {
    amarelo: "#f5c542",
    azul: "#2563eb",
    bege: "#d8b98c",
    branco: "#ffffff",
    cinza: "#9ca3af",
    creme: "#f3e6c8",
    preto: "#111827",
    rosa: "#f472b6",
    roxo: "#7c3aed",
    verde: "#16a34a",
    vermelho: "#dc2626"
  };

  return colorMap[normalizedColor] ?? "#d9e0e4";
}
