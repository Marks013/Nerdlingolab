"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { CartItem } from "@/features/cart/types";
import { useCartStore } from "@/features/cart/cart-store";

interface AddToCartButtonProps {
  item: CartItem;
  availableStock: number;
}

export function AddToCartButton({ item, availableStock }: AddToCartButtonProps): React.ReactElement {
  const addItem = useCartStore((state) => state.addItem);
  const [wasAdded, setWasAdded] = useState(false);
  const isUnavailable = availableStock <= 0;

  if (wasAdded) {
    return (
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
      className="mt-8 w-full sm:w-fit"
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
