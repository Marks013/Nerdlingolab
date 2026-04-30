interface CustomerRegistrationFields {
  birthday: Date | null;
  cpf: string | null;
  privacyAcceptedAt: Date | null;
  termsAcceptedAt: Date | null;
}

export function isCustomerRegistrationComplete(user: CustomerRegistrationFields): boolean {
  return Boolean(user.cpf && user.birthday && user.termsAcceptedAt && user.privacyAcceptedAt);
}

export function sanitizeCustomerNextPath(value: string | null | undefined, fallback = "/conta"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://") || value.startsWith("/admin")) {
    return fallback;
  }

  return value;
}
