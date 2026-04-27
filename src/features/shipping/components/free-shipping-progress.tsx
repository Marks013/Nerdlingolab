import { Truck } from "lucide-react";

import { formatCurrency } from "@/lib/format";

interface FreeShippingProgressProps {
  className?: string;
  subtotalCents: number;
  thresholdCents: number;
}

export function FreeShippingProgress({
  className = "",
  subtotalCents,
  thresholdCents
}: FreeShippingProgressProps): React.ReactElement | null {
  if (thresholdCents <= 0) {
    return null;
  }

  const remainingCents = Math.max(0, thresholdCents - subtotalCents);
  const progress = Math.min(100, Math.round((subtotalCents / thresholdCents) * 100));
  const hasFreeShipping = remainingCents === 0;

  return (
    <div className={`free-shipping-meter rounded-lg border border-primary/25 bg-[#fff7ef] p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
          <Truck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#1c1c1c]">
            {hasFreeShipping ? "Frete grátis liberado" : `Faltam ${formatCurrency(remainingCents)} para frete grátis`}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#677279]">
            Meta configurada no admin: {formatCurrency(thresholdCents)}
          </p>
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white shadow-inner ring-1 ring-primary/15">
        <div
          aria-label={`Progresso para frete grátis: ${progress}%`}
          className="h-full rounded-full bg-[linear-gradient(90deg,#ff6902,#ff9d1b,#24c27a)] transition-[width] duration-700 ease-out"
          role="progressbar"
          style={{ width: `${progress}%` }}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress}
        />
      </div>
    </div>
  );
}
