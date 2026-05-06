ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "showOnOffers" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Coupon_isActive_showOnOffers_idx" ON "Coupon"("isActive", "showOnOffers");
