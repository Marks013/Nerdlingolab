import { CouponType } from "@/generated/prisma/client";
import { z } from "zod";

import { parseCurrencyToCents } from "@/lib/format";

export const couponFormSchema = z.object({
  assignedUserId: z.string().trim().optional(),
  code: z.string().trim().min(3, "Informe um codigo com pelo menos 3 caracteres."),
  expiresAt: z.string().trim().optional(),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  maxDiscount: z.string().trim().optional(),
  minSubtotal: z.string().trim().optional(),
  perCustomerLimit: z.coerce.number().int().positive().optional(),
  startsAt: z.string().trim().optional(),
  type: z.enum(CouponType),
  usageLimit: z.coerce.number().int().positive().optional(),
  value: z.string().trim().min(1, "Informe o valor do cupom.")
});

export type CouponFormInput = z.infer<typeof couponFormSchema>;

export function normalizeCouponInput(input: CouponFormInput): {
  assignedUserId?: string;
  code: string;
  expiresAt?: Date;
  isActive: boolean;
  isPublic: boolean;
  maxDiscountCents?: number;
  minSubtotalCents?: number;
  perCustomerLimit?: number;
  startsAt?: Date;
  type: CouponType;
  usageLimit?: number;
  value: number;
} {
  return {
    assignedUserId: input.assignedUserId || undefined,
    code: input.code.toUpperCase(),
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    isActive: input.isActive,
    isPublic: input.isPublic,
    maxDiscountCents: input.maxDiscount ? parseCurrencyToCents(input.maxDiscount) : undefined,
    minSubtotalCents: input.minSubtotal ? parseCurrencyToCents(input.minSubtotal) : undefined,
    perCustomerLimit: input.perCustomerLimit,
    startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
    type: input.type,
    usageLimit: input.usageLimit,
    value: normalizeCouponValue(input.type, input.value)
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
