import { z } from "zod";

export const customerAddressSchema = z.object({
  recipient: z.string().trim().min(2).max(120),
  postalCode: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length === 8, "CEP inválido."),
  street: z.string().trim().min(2).max(160),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(120).optional(),
  district: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  country: z.string().trim().default("BR")
});

export const customerAddressFormSchema = customerAddressSchema.extend({
  label: z.string().trim().max(80).optional(),
  isDefault: z.coerce.boolean().optional()
});

export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;
export type CustomerAddressFormInput = z.infer<typeof customerAddressFormSchema>;
