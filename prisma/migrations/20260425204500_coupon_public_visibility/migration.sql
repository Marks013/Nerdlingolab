ALTER TABLE "Coupon" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Coupon_isActive_isPublic_idx" ON "Coupon"("isActive", "isPublic");
