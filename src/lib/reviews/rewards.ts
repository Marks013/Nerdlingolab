import { ProductReviewRewardMode } from "@/generated/prisma/client";
import { formatCurrency } from "@/lib/format";

export function formatReviewReward(settings: {
  couponValueCents: number;
  nerdcoinsRewardPoints: number;
  rewardMode: ProductReviewRewardMode;
}): string {
  if (settings.rewardMode === ProductReviewRewardMode.COUPON) {
    return `cupom de ${formatCurrency(settings.couponValueCents)}`;
  }

  if (settings.rewardMode === ProductReviewRewardMode.NERDCOINS) {
    return `${settings.nerdcoinsRewardPoints} Nerdcoins`;
  }

  return "sem recompensa automática";
}

export function formatReaisInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
