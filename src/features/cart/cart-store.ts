"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CartItem, CartValidationRequestItem } from "@/features/cart/types";

interface CartState {
  items: CartItem[];
  couponCode: string;
  loyaltyPointsToRedeem: number;
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  setCouponCode: (couponCode: string) => void;
  setLoyaltyPointsToRedeem: (points: number) => void;
  clearCart: () => void;
  getValidationPayload: () => CartValidationRequestItem[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: "",
      loyaltyPointsToRedeem: 0,
      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find((cartItem) => cartItem.variantId === item.variantId);

          if (!existingItem) {
            return {
              items: [...state.items, { ...item, quantity: Math.max(1, item.quantity) }]
            };
          }

          return {
            items: state.items.map((cartItem) =>
              cartItem.variantId === item.variantId
                ? { ...cartItem, quantity: cartItem.quantity + Math.max(1, item.quantity) }
                : cartItem
            )
          };
        });
      },
      removeItem: (variantId) => {
        set((state) => ({
          items: state.items.filter((item) => item.variantId !== variantId)
        }));
      },
      setQuantity: (variantId, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.variantId === variantId ? { ...item, quantity: Math.max(1, quantity) } : item
          )
        }));
      },
      setCouponCode: (couponCode) => {
        set({ couponCode });
      },
      setLoyaltyPointsToRedeem: (points) => {
        set({ loyaltyPointsToRedeem: Math.max(0, Math.floor(points)) });
      },
      clearCart: () => {
        set({ items: [], couponCode: "", loyaltyPointsToRedeem: 0 });
      },
      getValidationPayload: () =>
        get().items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity
        }))
    }),
    {
      name: "nerdlingolab-cart"
    }
  )
);
