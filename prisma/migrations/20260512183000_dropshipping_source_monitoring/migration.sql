DO $$ BEGIN
  CREATE TYPE "SupplierProvider" AS ENUM ('MERCADO_LIVRE', 'SHOPEE', 'MANUAL', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SupplierSourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED', 'DELETED', 'OUT_OF_STOCK', 'UNKNOWN', 'ERROR', 'CONFIG_REQUIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SupplierAlertType" AS ENUM ('PRICE_INCREASE', 'PRICE_DECREASE', 'OUT_OF_STOCK', 'SOURCE_PAUSED', 'SOURCE_CLOSED', 'SOURCE_DELETED', 'VARIANT_MISSING', 'LINK_INVALID', 'API_ERROR', 'CONFIG_REQUIRED', 'MARGIN_BELOW_MIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SupplierAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SupplierAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PricingRuleScope" AS ENUM ('GLOBAL', 'SUPPLIER', 'CATEGORY', 'PRODUCT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PricingRoundingMode" AS ENUM ('NONE', 'END_90', 'END_99', 'INTEGER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Supplier" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" "SupplierProvider" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "apiBaseUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductSource" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "provider" "SupplierProvider" NOT NULL,
  "originalUrl" TEXT NOT NULL,
  "externalId" TEXT,
  "externalShopId" TEXT,
  "externalVariantId" TEXT,
  "title" TEXT,
  "status" "SupplierSourceStatus" NOT NULL DEFAULT 'UNKNOWN',
  "lastPriceCents" INTEGER,
  "lastCurrency" TEXT,
  "lastStockQuantity" INTEGER,
  "lastCheckedAt" TIMESTAMP(3),
  "lastSuccessfulSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
  "checkoutPolicy" "SupplierSourceStatus" NOT NULL DEFAULT 'UNKNOWN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductSourceSnapshot" (
  "id" TEXT NOT NULL,
  "productSourceId" TEXT NOT NULL,
  "status" "SupplierSourceStatus" NOT NULL,
  "title" TEXT,
  "priceCents" INTEGER,
  "currency" TEXT,
  "stockQuantity" INTEGER,
  "variantCount" INTEGER NOT NULL DEFAULT 0,
  "rawSummary" JSONB NOT NULL DEFAULT '{}',
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductSourceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductSourceVariant" (
  "id" TEXT NOT NULL,
  "productSourceId" TEXT NOT NULL,
  "variantId" TEXT,
  "externalVariantId" TEXT,
  "title" TEXT,
  "optionValues" JSONB NOT NULL DEFAULT '{}',
  "priceCents" INTEGER,
  "currency" TEXT,
  "stockQuantity" INTEGER,
  "imageUrl" TEXT,
  "status" "SupplierSourceStatus" NOT NULL DEFAULT 'UNKNOWN',
  "lastCheckedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSourceVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PricingRule" (
  "id" TEXT NOT NULL,
  "scope" "PricingRuleScope" NOT NULL,
  "supplierId" TEXT,
  "productId" TEXT,
  "categoryId" TEXT,
  "marginPercent" DECIMAL(8,2) NOT NULL DEFAULT 35,
  "marginFixedCents" INTEGER NOT NULL DEFAULT 0,
  "minimumMarginCents" INTEGER NOT NULL DEFAULT 1000,
  "roundingMode" "PricingRoundingMode" NOT NULL DEFAULT 'END_90',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SourceAlert" (
  "id" TEXT NOT NULL,
  "productSourceId" TEXT NOT NULL,
  "type" "SupplierAlertType" NOT NULL,
  "severity" "SupplierAlertSeverity" NOT NULL DEFAULT 'WARNING',
  "status" "SupplierAlertStatus" NOT NULL DEFAULT 'OPEN',
  "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SourceAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_provider_name_key" ON "Supplier"("provider", "name");
CREATE INDEX IF NOT EXISTS "Supplier_provider_isActive_idx" ON "Supplier"("provider", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "ProductSource_productId_supplierId_originalUrl_key" ON "ProductSource"("productId", "supplierId", "originalUrl");
CREATE INDEX IF NOT EXISTS "ProductSource_provider_externalId_idx" ON "ProductSource"("provider", "externalId");
CREATE INDEX IF NOT EXISTS "ProductSource_status_lastCheckedAt_idx" ON "ProductSource"("status", "lastCheckedAt");
CREATE INDEX IF NOT EXISTS "ProductSource_syncEnabled_lastCheckedAt_idx" ON "ProductSource"("syncEnabled", "lastCheckedAt");

CREATE INDEX IF NOT EXISTS "ProductSourceSnapshot_productSourceId_fetchedAt_idx" ON "ProductSourceSnapshot"("productSourceId", "fetchedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "ProductSourceVariant_productSourceId_externalVariantId_key" ON "ProductSourceVariant"("productSourceId", "externalVariantId");
CREATE INDEX IF NOT EXISTS "ProductSourceVariant_variantId_idx" ON "ProductSourceVariant"("variantId");
CREATE INDEX IF NOT EXISTS "ProductSourceVariant_status_idx" ON "ProductSourceVariant"("status");

CREATE INDEX IF NOT EXISTS "PricingRule_scope_isActive_idx" ON "PricingRule"("scope", "isActive");
CREATE INDEX IF NOT EXISTS "PricingRule_supplierId_idx" ON "PricingRule"("supplierId");
CREATE INDEX IF NOT EXISTS "PricingRule_productId_idx" ON "PricingRule"("productId");
CREATE INDEX IF NOT EXISTS "PricingRule_categoryId_idx" ON "PricingRule"("categoryId");

CREATE INDEX IF NOT EXISTS "SourceAlert_status_severity_createdAt_idx" ON "SourceAlert"("status", "severity", "createdAt");
CREATE INDEX IF NOT EXISTS "SourceAlert_productSourceId_status_idx" ON "SourceAlert"("productSourceId", "status");

DO $$ BEGIN
  ALTER TABLE "ProductSource" ADD CONSTRAINT "ProductSource_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductSource" ADD CONSTRAINT "ProductSource_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductSourceSnapshot" ADD CONSTRAINT "ProductSourceSnapshot_productSourceId_fkey" FOREIGN KEY ("productSourceId") REFERENCES "ProductSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductSourceVariant" ADD CONSTRAINT "ProductSourceVariant_productSourceId_fkey" FOREIGN KEY ("productSourceId") REFERENCES "ProductSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductSourceVariant" ADD CONSTRAINT "ProductSourceVariant_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SourceAlert" ADD CONSTRAINT "SourceAlert_productSourceId_fkey" FOREIGN KEY ("productSourceId") REFERENCES "ProductSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

INSERT INTO "Supplier" ("id", "name", "provider", "isActive", "createdAt", "updatedAt")
VALUES
  ('supplier_mercado_livre', 'Mercado Livre', 'MERCADO_LIVRE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('supplier_shopee', 'Shopee', 'SHOPEE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("provider", "name") DO NOTHING;

INSERT INTO "PricingRule" ("id", "scope", "marginPercent", "marginFixedCents", "minimumMarginCents", "roundingMode", "isActive", "createdAt", "updatedAt")
VALUES ('pricing_global_default', 'GLOBAL', 35, 0, 1000, 'END_90', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
