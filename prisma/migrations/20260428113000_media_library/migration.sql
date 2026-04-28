CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "originalUrl" TEXT,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "source" TEXT NOT NULL DEFAULT 'UPLOAD',
  "altText" TEXT,
  "createdById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAssetUsage" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "productId" TEXT,
  "ownerType" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "fieldName" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MediaAssetUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaAsset_objectKey_key" ON "MediaAsset"("objectKey");
CREATE INDEX "MediaAsset_source_createdAt_idx" ON "MediaAsset"("source", "createdAt");
CREATE INDEX "MediaAsset_deletedAt_idx" ON "MediaAsset"("deletedAt");
CREATE UNIQUE INDEX "MediaAssetUsage_assetId_ownerType_ownerId_fieldName_sortOrder_key" ON "MediaAssetUsage"("assetId", "ownerType", "ownerId", "fieldName", "sortOrder");
CREATE INDEX "MediaAssetUsage_ownerType_ownerId_idx" ON "MediaAssetUsage"("ownerType", "ownerId");
CREATE INDEX "MediaAssetUsage_productId_idx" ON "MediaAssetUsage"("productId");

ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaAssetUsage"
ADD CONSTRAINT "MediaAssetUsage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaAssetUsage"
ADD CONSTRAINT "MediaAssetUsage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
