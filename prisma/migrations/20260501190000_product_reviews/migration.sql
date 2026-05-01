CREATE TYPE "ProductReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED', 'HIDDEN');

CREATE TYPE "ProductReviewRewardMode" AS ENUM ('NONE', 'COUPON', 'NERDCOINS');

CREATE TYPE "ProductReviewMediaType" AS ENUM ('IMAGE', 'VIDEO');

CREATE TABLE "ProductReviewSettings" (
  "id" TEXT NOT NULL,
  "singletonKey" TEXT NOT NULL DEFAULT 'default',
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "requireDeliveredOrder" BOOLEAN NOT NULL DEFAULT true,
  "allowImages" BOOLEAN NOT NULL DEFAULT true,
  "allowVideos" BOOLEAN NOT NULL DEFAULT true,
  "maxImages" INTEGER NOT NULL DEFAULT 3,
  "maxVideos" INTEGER NOT NULL DEFAULT 1,
  "maxVideoSeconds" INTEGER NOT NULL DEFAULT 30,
  "rewardMode" "ProductReviewRewardMode" NOT NULL DEFAULT 'COUPON',
  "couponValueCents" INTEGER NOT NULL DEFAULT 500,
  "nerdcoinsRewardPoints" INTEGER NOT NULL DEFAULT 50,
  "couponExpiresInDays" INTEGER NOT NULL DEFAULT 30,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductReviewSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductReview" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "body" TEXT NOT NULL,
  "status" "ProductReviewStatus" NOT NULL DEFAULT 'PENDING',
  "publicConsent" BOOLEAN NOT NULL DEFAULT true,
  "adminNotes" TEXT,
  "rejectionReason" TEXT,
  "rewardMode" "ProductReviewRewardMode",
  "rewardCouponId" TEXT,
  "rewardPoints" INTEGER,
  "rewardGrantedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductReviewMedia" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "mediaType" "ProductReviewMediaType" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductReviewMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductReviewSettings_singletonKey_key" ON "ProductReviewSettings"("singletonKey");
CREATE UNIQUE INDEX "ProductReview_orderItemId_key" ON "ProductReview"("orderItemId");
CREATE INDEX "ProductReview_productId_status_publishedAt_idx" ON "ProductReview"("productId", "status", "publishedAt");
CREATE INDEX "ProductReview_userId_createdAt_idx" ON "ProductReview"("userId", "createdAt");
CREATE INDEX "ProductReview_status_createdAt_idx" ON "ProductReview"("status", "createdAt");
CREATE INDEX "ProductReview_orderId_idx" ON "ProductReview"("orderId");
CREATE UNIQUE INDEX "ProductReviewMedia_reviewId_assetId_key" ON "ProductReviewMedia"("reviewId", "assetId");
CREATE INDEX "ProductReviewMedia_reviewId_sortOrder_idx" ON "ProductReviewMedia"("reviewId", "sortOrder");
CREATE INDEX "ProductReviewMedia_assetId_idx" ON "ProductReviewMedia"("assetId");

ALTER TABLE "ProductReview"
  ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductReview_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductReview_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductReview_rewardCouponId_fkey" FOREIGN KEY ("rewardCouponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductReviewMedia"
  ADD CONSTRAINT "ProductReviewMedia_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ProductReview"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductReviewMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ProductReviewSettings" ("id", "updatedAt")
VALUES ('default-product-review-settings', CURRENT_TIMESTAMP)
ON CONFLICT ("singletonKey") DO NOTHING;
