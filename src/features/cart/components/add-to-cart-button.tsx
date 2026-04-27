"use client";

import { CheckCircle2, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/features/cart/cart-store";
import type { CartItem } from "@/features/cart/types";

interface AddToCartButtonProps {
  availableStock: number;
  item: CartItem;
}

export function AddToCartButton({ item, availableStock }: AddToCartButtonProps): React.ReactElement {
  const addItem = useCartStore((state) => state.addItem);
  const [wasAdded, setWasAdded] = useState(false);
  const isUnavailable = availableStock <= 0;

  if (wasAdded) {
    return (
      <Button asChild className="h-12 w-full bg-[#111827] font-black text-white hover:bg-[#1f2937]" size="lg">
        <Link href="/carrinho">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Adicionado. Ver carrinho
        </Link>
      </Button>
    );
  }

  return (
    <Button
      className="h-12 w-full border border-[#d8d8d8] bg-white text-black hover:bg-[#f7f7f7]"
      disabled={isUnavailable}
      onClick={() => {
        addItem(item);
        setWasAdded(true);
      }}
      size="lg"
      type="button"
    >
      <ShoppingCart className="mr-2 h-4 w-4" />
      {isUnavailable ? "Indisponível" : "Adicionar ao carrinho"}
    </Button>
  );
}
