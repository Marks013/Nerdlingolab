"use client";

import { ShoppingCart } from "lucide-react";
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
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/carrinho">Ver carrinho</Link>
        </Button>
        <Button
          onClick={() => {
            setWasAdded(false);
          }}
          size="lg"
          type="button"
          variant="outline"
        >
          Continuar comprando
        </Button>
      </div>
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
