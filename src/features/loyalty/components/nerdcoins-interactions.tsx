"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { CouponCopyButton } from "@/features/coupons/components/coupon-copy-button";

interface AnimatedProgressMeterProps {
  label: string;
  value: number;
}

interface ShareReferralButtonProps {
  referralUrl: string;
}

export function AnimatedProgressMeter({ label, value }: AnimatedProgressMeterProps): React.ReactElement {
  const [isReady, setIsReady] = useState(false);
  const safeValue = Math.max(0, Math.min(100, value));

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="grid gap-2 rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-black">{label}</span>
        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-primary tabular-nums">
          {safeValue}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-orange-100">
        <div
          className="h-full origin-left rounded-full bg-primary transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{ transform: `scaleX(${isReady ? safeValue / 100 : 0})` }}
        />
      </div>
    </div>
  );
}

export { CouponCopyButton as CopyCouponButton };

export function ShareReferralButton({ referralUrl }: ShareReferralButtonProps): React.ReactElement {
  const [shared, setShared] = useState(false);

  async function shareReferral(): Promise<void> {
    if (navigator.share) {
      await navigator.share({
        text: "Entre na NerdLingoLab pelo meu convite e ganhe NerdCoins no cadastro.",
        title: "Convite NerdLingoLab",
        url: referralUrl
      });
    } else {
      await copyText(referralUrl);
    }

    setShared(true);
    window.setTimeout(() => setShared(false), 1800);
  }

  return (
    <Button className="w-full sm:w-auto" onClick={() => void shareReferral()} type="button">
      {shared ? <Check className="mr-2 size-4" /> : <Share2 className="mr-2 size-4" />}
      {shared ? "Link pronto" : "Compartilhar indicação"}
    </Button>
  );
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}
