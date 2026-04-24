"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShippingOption } from "@/features/cart/types";
import { formatCurrency } from "@/lib/format";
import { parseFriendlyResponse } from "@/lib/http/friendly-response";

interface ShippingEstimatorProps {
  itemCount?: number;
  subtotalCents: number;
}

interface ShippingQuoteResponse {
  options: ShippingOption[];
}

export function ShippingEstimator({
  itemCount = 1,
  subtotalCents
}: ShippingEstimatorProps): React.ReactElement {
  const [postalCode, setPostalCode] = useState("");
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function quoteShipping(): Promise<void> {
    setIsLoading(true);
    setMessage(null);

    const response = await fetch("/api/shipping/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemCount, postalCode, subtotalCents })
    });
    const parsedResponse = await parseFriendlyResponse<ShippingQuoteResponse>(
      response,
      "Não foi possível calcular o frete."
    );

    setIsLoading(false);

    if (!parsedResponse.ok || !parsedResponse.payload) {
      setOptions([]);
      setMessage(parsedResponse.message);
      return;
    }

    setOptions(parsedResponse.payload.options);
    setMessage(parsedResponse.payload.options.length ? null : "Informe um CEP válido.");
  }

  return (
    <div className="mt-8 rounded-md border p-4">
      <p className="text-sm font-medium">Calcular frete</p>
      <div className="mt-3 flex gap-2">
        <Input
          aria-label="CEP para calcular frete"
          inputMode="numeric"
          onChange={(event) => setPostalCode(event.target.value)}
          placeholder="00000-000"
          value={postalCode}
        />
        <Button disabled={isLoading} onClick={() => void quoteShipping()} type="button" variant="outline">
          {isLoading ? "Calculando..." : "Calcular"}
        </Button>
      </div>
      {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
      {options.length > 0 ? (
        <div className="mt-4 grid gap-2 text-sm">
          {options.map((option) => (
            <div className="rounded-md border p-3" key={option.id}>
              <div className="flex items-center justify-between gap-3">
                <strong>{option.name}</strong>
                <span>{formatCurrency(option.priceCents)}</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {option.description} Prazo estimado: {option.estimatedBusinessDays} dia(s) úteis.
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
