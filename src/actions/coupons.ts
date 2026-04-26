"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";

import { couponFormSchema, normalizeCouponInput } from "@/features/coupons/schemas";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function createCoupon(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsedInput = couponFormSchema.safeParse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    minSubtotal: formData.get("minSubtotal"),
    maxDiscount: formData.get("maxDiscount"),
    usageLimit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : undefined,
    perCustomerLimit: formData.get("perCustomerLimit")
      ? Number(formData.get("perCustomerLimit"))
      : undefined,
    expiresAt: formData.get("expiresAt"),
    isActive: formData.get("isActive") === "on",
    isPublic: formData.get("isPublic") === "on"
  });

  if (!parsedInput.success) {
    throw new Error(parsedInput.error.issues[0]?.message ?? "Cupom invalido.");
  }

  try {
    await prisma.coupon.create({
      data: normalizeCouponInput(parsedInput.data)
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível criar o cupom.");
  }

  revalidatePath("/admin/cupons");
  revalidatePath("/cupons");
}

export async function deactivateCoupon(couponId: string): Promise<void> {
  await requireAdmin();

  try {
    await prisma.coupon.update({
      where: { id: couponId },
      data: { isActive: false }
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível desativar o cupom.");
  }

  revalidatePath("/admin/cupons");
  revalidatePath("/cupons");
}

export async function setCouponPublicVisibility(
  couponId: string,
  isPublic: boolean
): Promise<void> {
  await requireAdmin();

  try {
    await prisma.coupon.update({
      where: { id: couponId },
      data: { isPublic }
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível atualizar a visibilidade do cupom.");
  }

  revalidatePath("/admin/cupons");
  revalidatePath("/cupons");
}
