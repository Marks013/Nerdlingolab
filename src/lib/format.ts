import { appCurrency, appLocale, normalizeDisplayText } from "@/lib/i18n";

export function formatCurrency(cents: number): string {
  return normalizeDisplayText(new Intl.NumberFormat(appLocale, {
    style: "currency",
    currency: appCurrency
  }).format(cents / 100));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) {
    return "-";
  }

  return normalizeDisplayText(new Intl.DateTimeFormat(appLocale, {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(date)));
}

export function parseCurrencyToCents(value: string): number {
  const normalizedValue = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const amount = Number.parseFloat(normalizedValue);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(amount * 100);
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
