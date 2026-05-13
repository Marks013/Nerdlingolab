"use client";

import type React from "react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";

interface ManualPricingRule {
  marginFixedCents: number;
  marginPercent: string;
  minimumMarginCents: number;
  roundingMode: string;
}

export function SupplierManualPricePreview({
  defaultValue,
  name,
  placeholder = "0,00",
  pricingRule
}: {
  defaultValue: number;
  name: string;
  placeholder?: string;
  pricingRule: ManualPricingRule | null;
}): React.ReactElement {
  const [value, setValue] = useState(formatCurrencyInput(defaultValue));
  const suggestedPrice = useMemo(() => {
    const sourcePriceCents = parseCurrencyToCents(value);

    if (!pricingRule || sourcePriceCents === null || sourcePriceCents <= 0) {
      return null;
    }

    return calculateSuggestedPrice(sourcePriceCents, pricingRule);
  }, [pricingRule, value]);

  return (
    <div className="grid gap-1">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">R$</span>
        <Input
          className="h-10 pl-9 text-sm"
          inputMode="decimal"
          name={name}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      </div>
      <p className="rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-[11px] font-bold leading-4 text-primary">
        {suggestedPrice === null ? "Informe o preço fornecedor para calcular a loja." : `Preço loja calculado: ${formatCurrency(suggestedPrice)}`}
      </p>
    </div>
  );
}

function calculateSuggestedPrice(sourcePriceCents: number, rule: ManualPricingRule): number {
  const marginPercent = Number(rule.marginPercent);
  const marginByPercent = Math.round(sourcePriceCents * ((Number.isFinite(marginPercent) ? marginPercent : 0) / 100));
  const marginCents = Math.max(rule.minimumMarginCents, marginByPercent + rule.marginFixedCents);
  const rawPrice = sourcePriceCents + marginCents;

  return applyRounding(rawPrice, rule.roundingMode);
}

function applyRounding(value: number, mode: string): number {
  if (mode === "END_90") {
    return roundToEnding(value, 90);
  }

  if (mode === "END_99") {
    return roundToEnding(value, 99);
  }

  if (mode === "INTEGER") {
    return Math.ceil(value / 100) * 100;
  }

  return value;
}

function roundToEnding(value: number, ending: number): number {
  const reais = Math.floor(value / 100);
  const candidate = reais * 100 + ending;

  return candidate >= value ? candidate : (reais + 1) * 100 + ending;
}

function parseCurrencyToCents(value: string): number | null {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();

  if (!normalized) {
    return null;
  }

  const numberValue = Number(normalized);

  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.round(numberValue * 100) : null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(value / 100);
}

function formatCurrencyInput(value: number): string {
  if (!value) {
    return "";
  }

  return (value / 100).toFixed(2).replace(".", ",");
}
