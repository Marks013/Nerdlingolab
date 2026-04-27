const CPF_LENGTH = 11;
const MIN_CUSTOMER_AGE = 13;
const MAX_CUSTOMER_AGE = 120;

export function normalizeCpf(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "").slice(0, CPF_LENGTH);
}

export function formatCpf(value: string | null | undefined): string {
  const cpf = normalizeCpf(value);

  if (cpf.length !== CPF_LENGTH) {
    return cpf;
  }

  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

export function getCpfLookupValues(value: string | null | undefined): string[] {
  const cpf = normalizeCpf(value);

  if (!cpf) {
    return [];
  }

  return [...new Set([cpf, formatCpf(cpf)])];
}

export function isValidCpf(value: string | null | undefined): boolean {
  const cpf = normalizeCpf(value);

  if (cpf.length !== CPF_LENGTH || /^(\d)\1+$/.test(cpf)) {
    return false;
  }

  const firstDigit = calculateCpfDigit(cpf.slice(0, 9));
  const secondDigit = calculateCpfDigit(`${cpf.slice(0, 9)}${firstDigit}`);

  return cpf === `${cpf.slice(0, 9)}${firstDigit}${secondDigit}`;
}

export function isValidBirthdayInput(value: string | null | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const birthday = parseBirthdayInput(value);

  if (!birthday || birthday.toISOString().slice(0, 10) !== value) {
    return false;
  }

  const today = new Date();
  const minDate = new Date(Date.UTC(today.getUTCFullYear() - MAX_CUSTOMER_AGE, today.getUTCMonth(), today.getUTCDate()));
  const maxDate = new Date(Date.UTC(today.getUTCFullYear() - MIN_CUSTOMER_AGE, today.getUTCMonth(), today.getUTCDate()));

  return birthday >= minDate && birthday <= maxDate;
}

export function parseBirthdayInput(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function normalizePhone(value: string | null | undefined): string | null {
  const phone = (value ?? "").replace(/\D/g, "").slice(0, 14);

  return phone || null;
}

function calculateCpfDigit(base: string): number {
  const factorStart = base.length + 1;
  const sum = base
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (factorStart - index), 0);
  const remainder = (sum * 10) % 11;

  return remainder === 10 ? 0 : remainder;
}
