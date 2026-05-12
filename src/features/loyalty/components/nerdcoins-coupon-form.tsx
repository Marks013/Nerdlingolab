"use client";

import { TicketPercent } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NerdcoinsCouponFormProps {
  action: (formData: FormData) => void | Promise<void>;
  balance: number;
  currentCouponValueLabel: string;
  isEnabled: boolean;
  maxRedeemPoints?: number | null;
  minRedeemPoints: number;
}

export function NerdcoinsCouponForm({
  action,
  balance,
  currentCouponValueLabel,
  isEnabled,
  maxRedeemPoints,
  minRedeemPoints
}: NerdcoinsCouponFormProps): React.ReactElement {
  const maxRedeemablePoints = Math.max(0, Math.min(balance, maxRedeemPoints ?? balance));
  const canGenerate = isEnabled && maxRedeemablePoints >= minRedeemPoints;

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[220px_1fr]">
      <div className="grid gap-2">
        <Input
          className="border-primary/45 bg-white font-semibold tabular-nums focus-visible:ring-primary"
          defaultValue={minRedeemPoints}
          max={maxRedeemablePoints}
          min={minRedeemPoints}
          name="points"
          type="number"
        />
        <p className="text-xs font-medium text-muted-foreground">
          Você pode converter até {maxRedeemablePoints} NerdCoins agora. Valor máximo: {currentCouponValueLabel}.
        </p>
      </div>
      <GenerateCouponButton canGenerate={canGenerate} />
    </form>
  );
}

function GenerateCouponButton({ canGenerate }: { canGenerate: boolean }): React.ReactElement {
  const status = useFormStatus();

  return (
    <Button
      className="h-full min-h-11 bg-primary text-white hover:bg-primary/90"
      disabled={!canGenerate || status.pending}
      type="submit"
      variant="secondary"
    >
      <TicketPercent className="mr-2 size-4" />
      {status.pending ? "Gerando cupom..." : "Gerar meu cupom"}
    </Button>
  );
}
