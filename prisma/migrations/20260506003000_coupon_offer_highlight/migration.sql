ALTER TABLE "Coupon" ADD COLUMN "showOnOffers" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Coupon_isActive_showOnOffers_idx" ON "Coupon"("isActive", "showOnOffers");
