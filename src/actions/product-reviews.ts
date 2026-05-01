"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";

import {
  CouponType,
  FulfillmentStatus,
  LoyaltyLedgerType,
  OrderStatus,
  PaymentStatus,
  ProductReviewMediaType,
  ProductReviewRewardMode,
  ProductReviewStatus
} from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { parseCurrencyToCents } from "@/lib/format";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { removeProductImageObject } from "@/lib/storage";
import { clampInteger, getProductReviewSettings } from "@/lib/reviews/settings";

export interface ProductReviewFormState {
  message: string;
  ok: boolean;
}

const defaultReviewState: ProductReviewFormState = {
  message: "",
  ok: false
};

export async function submitProductReview(
  _previousState: ProductReviewFormState = defaultReviewState,
  formData: FormData
): Promise<ProductReviewFormState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { message: "Entre na sua conta para avaliar o produto.", ok: false };
  }

  const orderItemId = String(formData.get("orderItemId") ?? "");
  const rating = clampInteger(formData.get("rating"), 0, 1, 5);
  const title = String(formData.get("title") ?? "").trim().slice(0, 90);
  const body = String(formData.get("body") ?? "").trim().slice(0, 1200);
  const publicConsent = formData.get("publicConsent") === "on";
  const requestedAssetIds = formData
    .getAll("assetIds")
    .map((value) => String(value))
    .filter((value) => /^[a-z0-9]+$/i.test(value));

  if (!orderItemId || rating < 1 || body.length < 10) {
    return { message: "Informe uma nota e um comentário com pelo menos 10 caracteres.", ok: false };
  }

  try {
    const settings = await getProductReviewSettings();

    if (!settings.isEnabled) {
      return { message: "As avaliações estão temporariamente indisponíveis.", ok: false };
    }

    const orderItem = await prisma.orderItem.findFirst({
      include: {
        order: true,
        review: true
      },
      where: {
        id: orderItemId,
        order: {
          userId: session.user.id
        }
      }
    });

    if (!orderItem) {
      return { message: "Item do pedido não encontrado.", ok: false };
    }

    if (!isOrderEligibleForReview(orderItem.order, settings.requireDeliveredOrder)) {
      return { message: "A avaliação fica disponível após a finalização da entrega.", ok: false };
    }

    if (orderItem.review && orderItem.review.status !== ProductReviewStatus.REJECTED) {
      return { message: "Este item já possui uma avaliação enviada.", ok: false };
    }

    const media = requestedAssetIds.length
      ? await prisma.mediaAsset.findMany({
          where: {
            createdById: session.user.id,
            deletedAt: null,
            id: { in: requestedAssetIds },
            source: "REVIEW"
          }
        })
      : [];

    const imageCount = media.filter((asset) => asset.mimeType.startsWith("image/")).length;
    const videoCount = media.filter((asset) => asset.mimeType.startsWith("video/")).length;

    if ((!settings.allowImages && imageCount > 0) || imageCount > settings.maxImages) {
      return { message: `Envie no máximo ${settings.maxImages} imagem(ns).`, ok: false };
    }

    if ((!settings.allowVideos && videoCount > 0) || videoCount > settings.maxVideos) {
      return { message: `Envie no máximo ${settings.maxVideos} vídeo(s) curto(s).`, ok: false };
    }

    await prisma.$transaction(async (tx) => {
      const review = orderItem.review
        ? await tx.productReview.update({
            data: {
              adminNotes: null,
              body,
              publicConsent,
              rating,
              rejectionReason: null,
              reviewedAt: null,
              reviewedById: null,
              status: ProductReviewStatus.PENDING,
              title: title || null
            },
            where: { id: orderItem.review.id }
          })
        : await tx.productReview.create({
            data: {
              body,
              orderId: orderItem.orderId,
              orderItemId: orderItem.id,
              productId: orderItem.productId,
              publicConsent,
              rating,
              status: ProductReviewStatus.PENDING,
              title: title || null,
              userId: session.user.id,
              variantId: orderItem.variantId
            }
          });

      await tx.productReviewMedia.deleteMany({
        where: { reviewId: review.id }
      });

      if (media.length > 0) {
        await tx.productReviewMedia.createMany({
          data: media.map((asset, index) => ({
            assetId: asset.id,
            mediaType: asset.mimeType.startsWith("video/")
              ? ProductReviewMediaType.VIDEO
              : ProductReviewMediaType.IMAGE,
            reviewId: review.id,
            sortOrder: index
          })),
          skipDuplicates: true
        });
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    return { message: "Não foi possível enviar sua avaliação agora.", ok: false };
  }

  revalidatePath("/conta");
  return { message: "Avaliação enviada para análise. Obrigado por ajudar a NerdLingoLab!", ok: true };
}

export async function updateProductReviewSettings(formData: FormData): Promise<void> {
  await requireAdmin();

  const rewardMode = parseRewardMode(formData.get("rewardMode"));
  const couponValueCents = Math.max(0, parseCurrencyToCents(String(formData.get("couponValueReais") ?? "")));

  await prisma.productReviewSettings.upsert({
    create: {
      allowImages: formData.get("allowImages") === "on",
      allowVideos: formData.get("allowVideos") === "on",
      couponExpiresInDays: clampInteger(formData.get("couponExpiresInDays"), 30, 1, 365),
      couponValueCents,
      isEnabled: formData.get("isEnabled") === "on",
      maxImages: clampInteger(formData.get("maxImages"), 3, 0, 10),
      maxVideoSeconds: clampInteger(formData.get("maxVideoSeconds"), 30, 5, 180),
      maxVideos: clampInteger(formData.get("maxVideos"), 1, 0, 3),
      nerdcoinsRewardPoints: clampInteger(formData.get("nerdcoinsRewardPoints"), 50, 0, 10000),
      requireDeliveredOrder: formData.get("requireDeliveredOrder") === "on",
      rewardMode,
      singletonKey: "default"
    },
    update: {
      allowImages: formData.get("allowImages") === "on",
      allowVideos: formData.get("allowVideos") === "on",
      couponExpiresInDays: clampInteger(formData.get("couponExpiresInDays"), 30, 1, 365),
      couponValueCents,
      isEnabled: formData.get("isEnabled") === "on",
      maxImages: clampInteger(formData.get("maxImages"), 3, 0, 10),
      maxVideoSeconds: clampInteger(formData.get("maxVideoSeconds"), 30, 5, 180),
      maxVideos: clampInteger(formData.get("maxVideos"), 1, 0, 3),
      nerdcoinsRewardPoints: clampInteger(formData.get("nerdcoinsRewardPoints"), 50, 0, 10000),
      requireDeliveredOrder: formData.get("requireDeliveredOrder") === "on",
      rewardMode
    },
    where: { singletonKey: "default" }
  });

  revalidatePath("/admin/avaliacoes");
}

export async function publishProductReview(reviewId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const session = await auth();
  const adminNotes = String(formData.get("adminNotes") ?? "").trim().slice(0, 1200) || null;
  const settings = await getProductReviewSettings();

  await prisma.$transaction(async (tx) => {
    const review = await tx.productReview.findUnique({
      include: {
        rewardCoupon: true
      },
      where: { id: reviewId }
    });

    if (!review) {
      throw new Error("Avaliação não encontrada.");
    }

    let rewardCouponId = review.rewardCouponId;
    let rewardPoints = review.rewardPoints;
    let rewardGrantedAt = review.rewardGrantedAt;
    let rewardMode = review.rewardMode;

    if (!rewardGrantedAt && settings.rewardMode !== ProductReviewRewardMode.NONE) {
      rewardMode = settings.rewardMode;
      rewardGrantedAt = new Date();

      if (settings.rewardMode === ProductReviewRewardMode.COUPON && settings.couponValueCents > 0) {
        const couponCode = `AVALIA${review.id.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
        const coupon = await tx.coupon.create({
          data: {
            assignedUserId: review.userId,
            code: couponCode,
            expiresAt: new Date(Date.now() + settings.couponExpiresInDays * 86_400_000),
            isActive: true,
            isPublic: false,
            perCustomerLimit: 1,
            type: CouponType.FIXED_AMOUNT,
            usageLimit: 1,
            value: settings.couponValueCents
          }
        });
        rewardCouponId = coupon.id;
      }

      if (settings.rewardMode === ProductReviewRewardMode.NERDCOINS && settings.nerdcoinsRewardPoints > 0) {
        const current = await tx.loyaltyPoints.upsert({
          create: { userId: review.userId },
          update: {},
          where: { userId: review.userId }
        });
        const nextBalance = current.balance + settings.nerdcoinsRewardPoints;

        await tx.loyaltyPoints.update({
          data: {
            balance: nextBalance,
            lifetimeEarned: { increment: settings.nerdcoinsRewardPoints }
          },
          where: { userId: review.userId }
        });
        await tx.loyaltyLedger.create({
          data: {
            balanceAfter: nextBalance,
            customerNote: "Recompensa por avaliação publicada",
            idempotencyKey: `product-review:${review.id}`,
            metadata: {
              productId: review.productId,
              reviewId: review.id
            },
            pointsDelta: settings.nerdcoinsRewardPoints,
            reason: "Avaliação de produto publicada",
            type: LoyaltyLedgerType.EARN,
            userId: review.userId
          }
        });
        rewardPoints = settings.nerdcoinsRewardPoints;
      }
    }

    await tx.productReview.update({
      data: {
        adminNotes,
        publishedAt: new Date(),
        rejectionReason: null,
        rewardCouponId,
        rewardGrantedAt,
        rewardMode,
        rewardPoints,
        reviewedAt: new Date(),
        reviewedById: session?.user?.id ?? null,
        status: ProductReviewStatus.PUBLISHED
      },
      where: { id: review.id }
    });
  });

  revalidateReviewAdminAndProducts();
}

export async function rejectProductReview(reviewId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const session = await auth();
  const rejectionReason = String(formData.get("rejectionReason") ?? "").trim().slice(0, 1200) || null;

  const review = await prisma.productReview.findUnique({
    select: {
      rewardGrantedAt: true,
      status: true
    },
    where: { id: reviewId }
  });

  if (!review) {
    throw new Error("Avaliação não encontrada.");
  }

  if (review.status === ProductReviewStatus.PUBLISHED || review.rewardGrantedAt) {
    throw new Error("Avaliações publicadas devem ser ocultadas, não recusadas.");
  }

  const mediaAssets = await prisma.productReviewMedia.findMany({
    include: { asset: true },
    where: { reviewId }
  });

  await prisma.$transaction(async (tx) => {
    await tx.productReviewMedia.deleteMany({
      where: { reviewId }
    });
    await tx.productReview.update({
      data: {
        publishedAt: null,
        rejectionReason,
        reviewedAt: new Date(),
        reviewedById: session?.user?.id ?? null,
        status: ProductReviewStatus.REJECTED
      },
      where: { id: reviewId }
    });
  });

  const cleanupResults = await Promise.allSettled(
    mediaAssets.map(async ({ asset }) => {
      await removeProductImageObject(asset.objectKey);
      await prisma.mediaAsset.update({
        data: { deletedAt: new Date() },
        where: { id: asset.id }
      });
    })
  );

  for (const result of cleanupResults) {
    if (result.status === "rejected") {
      Sentry.captureException(result.reason);
    }
  }

  revalidateReviewAdminAndProducts();
}

export async function hideProductReview(reviewId: string): Promise<void> {
  await requireAdmin();
  const session = await auth();

  await prisma.productReview.update({
    data: {
      reviewedAt: new Date(),
      reviewedById: session?.user?.id ?? null,
      status: ProductReviewStatus.HIDDEN
    },
    where: { id: reviewId }
  });

  revalidateReviewAdminAndProducts();
}

function parseRewardMode(value: FormDataEntryValue | null): ProductReviewRewardMode {
  if (value === ProductReviewRewardMode.NERDCOINS || value === ProductReviewRewardMode.NONE) {
    return value;
  }

  return ProductReviewRewardMode.COUPON;
}

function isOrderEligibleForReview(
  order: { fulfillmentStatus: FulfillmentStatus; paymentStatus: PaymentStatus; status: OrderStatus },
  requireDeliveredOrder: boolean
): boolean {
  if (requireDeliveredOrder) {
    return order.status === OrderStatus.DELIVERED || order.fulfillmentStatus === FulfillmentStatus.FULFILLED;
  }

  return order.paymentStatus === PaymentStatus.APPROVED || order.status !== OrderStatus.PENDING_PAYMENT;
}

function revalidateReviewAdminAndProducts(): void {
  revalidatePath("/admin/avaliacoes");
  revalidatePath("/produtos");
  revalidatePath("/");
}
