CREATE TABLE "LoyaltyCampaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "showOnStorefront" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "pointsMultiplier" INTEGER NOT NULL DEFAULT 100,
  "bonusPoints" INTEGER NOT NULL DEFAULT 0,
  "minSubtotalCents" INTEGER,
  "categoryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "productTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoyaltyCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoyaltyNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "type" TEXT NOT NULL,
  "sourceLedgerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "email" TEXT,
  "errorMessage" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoyaltyCampaign_isActive_startsAt_endsAt_idx" ON "LoyaltyCampaign"("isActive", "startsAt", "endsAt");
CREATE INDEX "LoyaltyCampaign_showOnStorefront_idx" ON "LoyaltyCampaign"("showOnStorefront");
CREATE UNIQUE INDEX "LoyaltyNotification_idempotencyKey_key" ON "LoyaltyNotification"("idempotencyKey");
CREATE INDEX "LoyaltyNotification_userId_type_idx" ON "LoyaltyNotification"("userId", "type");
CREATE INDEX "LoyaltyNotification_sourceLedgerId_idx" ON "LoyaltyNotification"("sourceLedgerId");

ALTER TABLE "LoyaltyNotification" ADD CONSTRAINT "LoyaltyNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
