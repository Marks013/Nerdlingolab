export interface BrazilianPostalCodeAddress {
  city: string;
  complement: string;
  district: string;
  postalCode: string;
  state: string;
  street: string;
}

export interface BrazilianAddressInput {
  city: string;
  district: string;
  postalCode: string;
  state: string;
  street: string;
}

export interface BrazilianAddressValidationResult {
  address?: BrazilianPostalCodeAddress;
  message?: string;
  ok: boolean;
}

const BRAZILIAN_STATE_CODES = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO"
]);

interface ViaCepResponse {
  bairro?: string;
  complemento?: string;
  erro?: boolean;
  localidade?: string;
  logradouro?: string;
  uf?: string;
}

export function normalizeBrazilianPostalCode(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 8);
}

export function isValidBrazilianStateCode(value: string | null | undefined): boolean {
  return BRAZILIAN_STATE_CODES.has(String(value ?? "").trim().toUpperCase());
}

export function formatBrazilianPostalCode(value: string | null | undefined): string {
  const digits = normalizeBrazilianPostalCode(value);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export async function lookupBrazilianPostalCode(value: string): Promise<BrazilianAddressValidationResult> {
  const postalCode = normalizeBrazilianPostalCode(value);

  if (postalCode.length !== 8) {
    return { ok: false, message: "Informe um CEP com 8 números." };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`, {
      signal: controller.signal
    });

    clearTimeout(timeout);

    const payload = await response.json() as ViaCepResponse;

    if (!response.ok || payload.erro) {
      return { ok: false, message: "CEP não encontrado. Confira os números informados." };
    }

    const state = String(payload.uf ?? "").trim().toUpperCase();

    if (!isValidBrazilianStateCode(state)) {
      return { ok: false, message: "UF retornada pelo CEP é inválida." };
    }

    return {
      ok: true,
      address: {
        city: String(payload.localidade ?? "").trim(),
        complement: String(payload.complemento ?? "").trim(),
        district: String(payload.bairro ?? "").trim(),
        postalCode,
        state,
        street: String(payload.logradouro ?? "").trim()
      }
    };
  } catch {
    return { ok: false, message: "Não foi possível consultar o CEP agora. Tente novamente." };
  }
}

export async function validateBrazilianAddress(address: BrazilianAddressInput): Promise<BrazilianAddressValidationResult> {
  const postalCodeResult = await lookupBrazilianPostalCode(address.postalCode);

  if (!postalCodeResult.ok || !postalCodeResult.address) {
    return postalCodeResult;
  }

  const officialAddress = postalCodeResult.address;
  const state = String(address.state).trim().toUpperCase();

  if (!isValidBrazilianStateCode(state)) {
    return { ok: false, message: "UF inválida. Use a sigla oficial do estado, como SP, RJ ou PR." };
  }

  if (state !== officialAddress.state) {
    return { ok: false, message: `Este CEP pertence ao estado ${officialAddress.state}.` };
  }

  if (officialAddress.city && address.city.trim() && normalizeAddressText(address.city) !== normalizeAddressText(officialAddress.city)) {
    return { ok: false, message: `Este CEP pertence à cidade ${officialAddress.city}.` };
  }

  return { ok: true, address: officialAddress };
}

function normalizeAddressText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}
