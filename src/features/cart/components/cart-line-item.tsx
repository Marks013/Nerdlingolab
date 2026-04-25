"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
        <div className="flex items-center gap-2">
          <Button
            aria-label={`Diminuir quantidade de ${item.title}`}
            disabled={item.quantity <= 1}
            onClick={() => onQuantityChange(item.variantId, item.quantity - 1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <Button
            aria-label={`Aumentar quantidade de ${item.title}`}
            disabled={item.quantity >= item.availableStock}
            onClick={() => onQuantityChange(item.variantId, item.quantity + 1)}
            size="icon"
            type="button"
            variant="outline"
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
