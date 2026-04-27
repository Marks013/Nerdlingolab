import { z } from "zod";

import { isValidBirthdayInput, isValidCpf, normalizeCpf, normalizePhone } from "@/lib/identity/brazil";

function optionalTrimmedString(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => value || null);
}

export const customerProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: optionalTrimmedString(30).transform((value) => normalizePhone(value)),
  cpf: z
    .string()
    .trim()
    .transform((value) => normalizeCpf(value))
    .refine((value) => isValidCpf(value), "CPF inválido."),
  birthday: z
    .string()
    .trim()
    .refine((value) => isValidBirthdayInput(value), "Data de nascimento inválida.")
});

export type CustomerProfileInput = z.infer<typeof customerProfileSchema>;
