export function normalizeLocalOrHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.startsWith("/") && !trimmedValue.startsWith("//")) {
    return trimmedValue;
  }

  try {
    const url = new URL(trimmedValue);

    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
