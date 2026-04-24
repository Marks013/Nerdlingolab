export function getImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function getPrimaryImageUrl(value: unknown): string | null {
  return getImageUrls(value)[0] ?? null;
}
