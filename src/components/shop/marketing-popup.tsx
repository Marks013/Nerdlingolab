"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SafeImage as Image } from "@/components/media/safe-image";
import type { PublicMarketingPopup } from "@/lib/engagement/config";

interface MarketingPopupProps {
  popup: PublicMarketingPopup | null;
}

export function MarketingPopup({ popup }: MarketingPopupProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(false);
  const storageKey = useMemo(() => popup ? `nerdlingolab:popup:${popup.id}` : "", [popup]);

  useEffect(() => {
    if (!popup || !storageKey) {
      return undefined;
    }

    const lastSeenAt = Number(window.localStorage.getItem(storageKey) ?? "0");
    const canShowAt = lastSeenAt + popup.frequencyHours * 60 * 60 * 1000;

    if (Date.now() < canShowAt) {
      return undefined;
    }

    const delay = popup.triggerType === "DELAY" ? popup.triggerValue : 1200;
    const timeoutId = window.setTimeout(() => setIsVisible(true), delay);

    return () => window.clearTimeout(timeoutId);
  }, [popup, storageKey]);

  if (!popup || !isVisible) {
    return null;
  }

  function close(): void {
    if (storageKey) {
      window.localStorage.setItem(storageKey, String(Date.now()));
    }
    setIsVisible(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 px-4 py-6 backdrop-blur-sm sm:items-center">
      <section className="manga-panel relative grid w-full max-w-3xl overflow-hidden rounded-lg border-2 border-primary bg-white shadow-2xl sm:grid-cols-[0.95fr_1.05fr]">
        <button
          aria-label="Fechar anúncio"
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-sm transition hover:scale-105 hover:text-primary"
          onClick={close}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative min-h-[210px] bg-primary/10">
          {popup.imageUrl ? (
            <Image
              alt={popup.title}
              className="object-cover"
              fill
              sizes="(min-width: 640px) 340px, 100vw"
              src={popup.imageUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#ff6902,#ff9d1b)] px-6 text-center text-4xl font-black text-white">
              NerdLingoLab
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8">
          {popup.eyebrow ? (
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{popup.eyebrow}</p>
          ) : null}
          <h2 className="mt-3 text-3xl font-black leading-tight text-black">{popup.title}</h2>
          <p className="mt-4 text-sm leading-6 text-[#4f5d65]">{popup.description}</p>

          {popup.ctaHref && popup.ctaLabel ? (
            <Link
              className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-primary px-6 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/90"
              href={popup.ctaHref}
              onClick={close}
            >
              {popup.ctaLabel}
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
