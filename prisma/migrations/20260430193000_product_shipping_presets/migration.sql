ALTER TABLE "ProductVariant" ADD COLUMN "heightCm" INTEGER;
ALTER TABLE "ProductVariant" ADD COLUMN "widthCm" INTEGER;
ALTER TABLE "ProductVariant" ADD COLUMN "lengthCm" INTEGER;

CREATE TABLE "ProductShippingPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "widthCm" INTEGER NOT NULL,
    "lengthCm" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductShippingPreset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductShippingPreset_name_key" ON "ProductShippingPreset"("name");
CREATE INDEX "ProductShippingPreset_weightGrams_idx" ON "ProductShippingPreset"("weightGrams");
