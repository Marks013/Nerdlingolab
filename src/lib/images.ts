import { normalizeLocalOrHttpUrl } from "@/lib/urls";

export function isRemoteHttpImageUrl(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeImageUrl(value: unknown): string | null {
  return normalizeLocalOrHttpUrl(value);
}

export function shouldBypassNextImageOptimization(value: unknown): boolean {
  return isRemoteHttpImageUrl(value);
}
