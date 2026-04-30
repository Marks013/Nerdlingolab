CREATE TABLE "ManualShippingRate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "estimatedBusinessDays" INTEGER NOT NULL DEFAULT 5,
    "minSubtotalCents" INTEGER,
    "maxSubtotalCents" INTEGER,
    "minItems" INTEGER,
    "maxItems" INTEGER,
    "postalCodePrefixes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualShippingRate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManualShippingRate_isActive_sortOrder_idx" ON "ManualShippingRate"("isActive", "sortOrder");
