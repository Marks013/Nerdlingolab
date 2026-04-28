import { z } from "zod";

import { customerAddressSchema } from "@/lib/addresses/schema";

export const checkoutRequestSchema = z.object({
  items: z.array(
    z.object({
      variantId: z.string().min(1),
      quantity: z.coerce.number().int().positive().max(99)
    })
  ).min(1).max(60),
  couponCode: z.string().trim().max(64).optional(),
  shippingOptionId: z.string().trim().min(1).max(64),
  savedAddressId: z.string().trim().min(1).max(128).optional(),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z.string().trim().max(30).optional(),
    cpf: z.string().trim().max(14).optional()
  }),
  shippingAddress: customerAddressSchema
});

export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>;
