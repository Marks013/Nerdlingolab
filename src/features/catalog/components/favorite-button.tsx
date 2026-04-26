"use client";

import { Star } from "lucide-react";
import { useSyncExternalStore } from "react";

const FAVORITES_STORAGE_KEY = "nerdlingolab:favorites";
const EMPTY_FAVORITES: FavoriteProduct[] = [];

let cachedFavoritesRawValue: string | null = null;
let cachedFavorites: FavoriteProduct[] = EMPTY_FAVORITES;

export interface FavoriteProduct {
  id: string;
  imageUrl?: string | null;
  priceCents: number;
  slug: string;
  title: string;
}

interface FavoriteButtonProps {
  product: FavoriteProduct;
}

export function FavoriteButton({ product }: FavoriteButtonProps): React.ReactElement {
  const favorites = useFavorites();
  const isFavorite = favorites.some((favorite) => favorite.id === product.id);

  const toggleFavorite = () => {
    const favorites = readFavorites();
    const nextFavorites = favorites.some((favorite) => favorite.id === product.id)
      ? favorites.filter((favorite) => favorite.id !== product.id)
      : [product, ...favorites];

    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));
    window.dispatchEvent(new Event("nerdlingolab:favorites-updated"));
  };

  return (
    <button
      aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition ${
        isFavorite ? "bg-primary text-white" : "bg-white/90 text-[#1c1c1c] hover:bg-white"
      }`}
      onClick={toggleFavorite}
      title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      type="button"
    >
      <Star className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
    </button>
  );
}

export function useFavorites(): FavoriteProduct[] {
  return useSyncExternalStore(subscribeToFavorites, readFavorites, () => EMPTY_FAVORITES);
}

export function readFavorites(): FavoriteProduct[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "[]";

    if (rawValue === cachedFavoritesRawValue) {
      return cachedFavorites;
    }

    const parsedValue = JSON.parse(rawValue);
    cachedFavoritesRawValue = rawValue;
    cachedFavorites = Array.isArray(parsedValue) ? parsedValue.filter(isFavoriteProduct) : EMPTY_FAVORITES;

    return cachedFavorites;
  } catch {
    return EMPTY_FAVORITES;
  }
}

function subscribeToFavorites(callback: () => void): () => void {
  window.addEventListener("nerdlingolab:favorites-updated", callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener("nerdlingolab:favorites-updated", callback);
    window.removeEventListener("storage", callback);
  };
}

function isFavoriteProduct(value: unknown): value is FavoriteProduct {
  if (!value || typeof value !== "object") {
    return false;
  }

  const product = value as Partial<FavoriteProduct>;

  return Boolean(product.id && product.slug && product.title && typeof product.priceCents === "number");
}
