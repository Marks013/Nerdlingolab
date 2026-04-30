"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { couponFormSchema, normalizeCouponInput } from "@/features/coupons/schemas";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function createCoupon(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsedInput = couponFormSchema.safeParse({
    code: formData.get("code"),
    assignedUserId: formData.get("assignedUserId"),
    expiresAt: formData.get("expiresAt"),
    maxDiscount: formData.get("maxDiscount"),
    minSubtotal: formData.get("minSubtotal"),
    perCustomerLimit: formData.get("perCustomerLimit")
      ? Number(formData.get("perCustomerLimit"))
      : undefined,
    startsAt: formData.get("startsAt"),
    type: formData.get("type"),
    usageLimit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : undefined,
    value: formData.get("value"),
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
  redirect("/admin/cupons?coupon=created");
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

export async function activateCoupon(couponId: string): Promise<void> {
  await requireAdmin();

  try {
    await prisma.coupon.update({
      data: { isActive: true },
      where: { id: couponId }
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Nao foi possivel ativar o cupom.");
  }

  revalidatePath("/admin/cupons");
  revalidatePath("/cupons");
}
