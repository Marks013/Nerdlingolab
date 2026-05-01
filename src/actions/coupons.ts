"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { couponFormSchema, normalizeCouponInput } from "@/features/coupons/schemas";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function createCoupon(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsedInput = couponFormSchema.safeParse(readCouponFormData(formData));

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

export async function updateCoupon(couponId: string, formData: FormData): Promise<void> {
  await requireAdmin();

  const parsedInput = couponFormSchema.safeParse(readCouponFormData(formData));

  if (!parsedInput.success) {
    throw new Error(parsedInput.error.issues[0]?.message ?? "Cupom inválido.");
  }

  const normalizedInput = normalizeCouponInput(parsedInput.data);

  try {
    await prisma.coupon.update({
      data: {
        ...normalizedInput,
        assignedUserId: normalizedInput.assignedUserId ?? null,
        expiresAt: normalizedInput.expiresAt ?? null,
        maxDiscountCents: normalizedInput.maxDiscountCents ?? null,
        minSubtotalCents: normalizedInput.minSubtotalCents ?? null,
        perCustomerLimit: normalizedInput.perCustomerLimit ?? null,
        startsAt: normalizedInput.startsAt ?? null,
        usageLimit: normalizedInput.usageLimit ?? null
      },
      where: { id: couponId }
    });
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Não foi possível atualizar o cupom.");
  }

  revalidatePath("/admin/cupons");
  revalidatePath("/cupons");
  redirect(`/admin/cupons?coupon=updated#coupon-${couponId}`);
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
    throw new Error("Não foi possível ativar o cupom.");
  }

  revalidatePath("/admin/cupons");
  revalidatePath("/cupons");
}

function readCouponFormData(formData: FormData) {
  return {
    assignedUserId: formData.get("assignedUserId"),
    code: formData.get("code"),
    expiresAt: formData.get("expiresAt"),
    isActive: formData.get("isActive") === "on",
    isPublic: formData.get("isPublic") === "on",
    maxDiscount: formData.get("maxDiscount"),
    minSubtotal: formData.get("minSubtotal"),
    perCustomerLimit: formData.get("perCustomerLimit")
      ? Number(formData.get("perCustomerLimit"))
      : undefined,
    startsAt: formData.get("startsAt"),
    type: formData.get("type"),
    usageLimit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : undefined,
    value: formData.get("value")
  };
}
