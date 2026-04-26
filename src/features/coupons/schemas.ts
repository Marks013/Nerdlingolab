import { CouponType } from "@/generated/prisma/client";
import { z } from "zod";

import { parseCurrencyToCents } from "@/lib/format";

export const couponFormSchema = z.object({
  code: z.string().trim().min(3, "Informe um código com pelo menos 3 caracteres."),
  type: z.enum(CouponType),
  value: z.string().trim().min(1, "Informe o valor do cupom."),
  minSubtotal: z.string().trim().optional(),
  maxDiscount: z.string().trim().optional(),
  usageLimit: z.coerce.number().int().positive().optional(),
  perCustomerLimit: z.coerce.number().int().positive().optional(),
  expiresAt: z.string().trim().optional(),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true)
});

export type CouponFormInput = z.infer<typeof couponFormSchema>;

export function normalizeCouponInput(input: CouponFormInput): {
  code: string;
  type: CouponType;
  value: number;
  minSubtotalCents?: number;
  maxDiscountCents?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  expiresAt?: Date;
  isActive: boolean;
  isPublic: boolean;
} {
  return {
    code: input.code.toUpperCase(),
    type: input.type,
    value: normalizeCouponValue(input.type, input.value),
    minSubtotalCents: input.minSubtotal ? parseCurrencyToCents(input.minSubtotal) : undefined,
    maxDiscountCents: input.maxDiscount ? parseCurrencyToCents(input.maxDiscount) : undefined,
    usageLimit: input.usageLimit,
    perCustomerLimit: input.perCustomerLimit,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    isActive: input.isActive,
    isPublic: input.isPublic
  };
}

function normalizeCouponValue(type: CouponType, value: string): number {
  if (type === CouponType.PERCENTAGE) {
    return Math.min(100, Math.max(1, Number.parseInt(value, 10)));
  }

  if (type === CouponType.FREE_SHIPPING) {
    return 0;
  }

  return parseCurrencyToCents(value);
}
