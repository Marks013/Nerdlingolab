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
  minRedeemPoints: number;
}

export function NerdcoinsCouponForm({
  action,
  balance,
  currentCouponValueLabel,
  isEnabled,
  minRedeemPoints
}: NerdcoinsCouponFormProps): React.ReactElement {
  const canGenerate = isEnabled && balance >= minRedeemPoints;

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[220px_1fr]">
      <div className="grid gap-2">
        <Input
          className="border-primary/45 bg-white font-semibold tabular-nums focus-visible:ring-primary"
          defaultValue={minRedeemPoints}
          max={balance}
          min={minRedeemPoints}
          name="points"
          type="number"
        />
        <p className="text-xs font-medium text-muted-foreground">
          Seu saldo pode virar até {currentCouponValueLabel}.
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
