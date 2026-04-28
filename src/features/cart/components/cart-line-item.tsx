"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import { SafeImage as Image } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { ValidatedCartItem } from "@/features/cart/types";

interface CartLineItemProps {
  imagePriority?: boolean;
  item: ValidatedCartItem;
  onQuantityChange: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
}

export function CartLineItem({
  imagePriority = false,
  item,
  onQuantityChange,
  onRemove
}: CartLineItemProps): React.ReactElement {
  return (
    <div className="grid gap-4 border-b py-4 sm:grid-cols-[96px_1fr_auto]">
      <Link
        aria-label={`Abrir ${item.title}`}
        className="relative aspect-square overflow-hidden rounded-lg bg-muted"
        href={`/produtos/${item.slug}`}
      >
        {item.imageUrl ? (
          <Image
            alt={`Imagem de ${item.title}`}
            className="object-cover"
            fill
            loading={imagePriority ? "eager" : undefined}
            preload={imagePriority}
            sizes="96px"
            src={item.imageUrl}
          />
        ) : null}
      </Link>
      <div>
        <Link className="font-medium hover:text-primary" href={`/produtos/${item.slug}`}>
          {item.title}
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">{item.variantTitle}</p>
        <p className="mt-2 text-sm font-medium">{formatCurrency(item.unitPriceCents)}</p>
        <p className="mt-1 text-xs text-muted-foreground">Estoque disponível: {item.availableStock}</p>
      </div>
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
        <div className="inline-flex h-11 overflow-hidden rounded-xl border-2 border-primary/70 bg-[#fff7ed] shadow-[0_8px_18px_rgba(255,102,0,0.14)]">
          <Button
            aria-label={`Diminuir quantidade de ${item.title}`}
            className="h-full w-11 rounded-none border-0 bg-[#fff0e3] text-primary shadow-none transition hover:bg-primary hover:text-white disabled:opacity-45"
            disabled={item.quantity <= 1}
            onClick={() => onQuantityChange(item.variantId, item.quantity - 1)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="flex w-12 items-center justify-center border-x-2 border-primary/30 bg-white text-sm font-black text-[#1c1c1c]">
            {item.quantity}
          </span>
          <Button
            aria-label={`Aumentar quantidade de ${item.title}`}
            className="h-full w-11 rounded-none border-0 bg-[#fff0e3] text-primary shadow-none transition hover:bg-primary hover:text-white disabled:opacity-45"
            disabled={item.quantity >= item.availableStock}
            onClick={() => onQuantityChange(item.variantId, item.quantity + 1)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-semibold">{formatCurrency(item.lineTotalCents)}</p>
          <Button
            aria-label={`Remover ${item.title}`}
            onClick={() => onRemove(item.variantId)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
