export const appLocale = "pt-BR";
export const appCurrency = "BRL";

export function normalizeDisplayText(value: string): string {
  return value.normalize("NFC");
}
