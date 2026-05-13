ALTER TABLE "ProductVariant"
ADD COLUMN "trackInventory" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ProductVariant"
SET "trackInventory" = false;
