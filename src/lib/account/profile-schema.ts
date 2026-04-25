import { z } from "zod";

function optionalTrimmedString(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => value || null);
}

export const customerProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: optionalTrimmedString(30),
  cpf: optionalTrimmedString(14),
  birthday: z
    .string()
    .trim()
    .transform((value) => value || null)
    .pipe(
      z
        .string()
        .date()
        .nullable()
    )
});

export type CustomerProfileInput = z.infer<typeof customerProfileSchema>;
