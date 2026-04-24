import { z } from "zod";

const addressSchema = z.object({
  recipient: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().min(8).max(12),
  street: z.string().trim().min(2).max(160),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(120).optional(),
  district: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().length(2),
  country: z.string().trim().default("BR")
});

export const checkoutRequestSchema = z.object({
  items: z.array(
    z.object({
      variantId: z.string().min(1),
      quantity: z.coerce.number().int().positive().max(99)
    })
  ).min(1).max(60),
  couponCode: z.string().trim().max(64).optional(),
  loyaltyPointsToRedeem: z.coerce.number().int().min(0).max(1_000_000).optional(),
  shippingOptionId: z.string().trim().min(1).max(64),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z.string().trim().max(30).optional(),
    cpf: z.string().trim().max(14).optional()
  }),
  shippingAddress: addressSchema
});

export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>;
