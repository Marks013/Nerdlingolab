import { normalizeImageUrl } from "@/lib/images";

export function getImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object" && "url" in item && typeof item.url === "string") {
        return item.url;
      }

      return null;
    })
    .map((item) => normalizeImageUrl(item))
    .filter((item): item is string => Boolean(item));
}

export function getPrimaryImageUrl(value: unknown): string | null {
  return getImageUrls(value)[0] ?? null;
}
