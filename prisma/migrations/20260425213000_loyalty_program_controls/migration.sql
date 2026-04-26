ALTER TABLE "Coupon" ADD COLUMN "assignedUserId" TEXT;

CREATE TABLE "LoyaltyProgramSettings" (
  "id" TEXT NOT NULL,
  "singletonKey" TEXT NOT NULL DEFAULT 'default',
  "programName" TEXT NOT NULL DEFAULT 'Nerdcoins',
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "pointsPerReal" INTEGER NOT NULL DEFAULT 5,
  "redeemCentsPerPoint" INTEGER NOT NULL DEFAULT 1,
  "minRedeemPoints" INTEGER NOT NULL DEFAULT 100,
  "maxRedeemPoints" INTEGER,
  "couponExpiresInDays" INTEGER NOT NULL DEFAULT 30,
  "pointsExpireInDays" INTEGER,
  "showPendingPoints" BOOLEAN NOT NULL DEFAULT true,
  "requireAccountToRedeem" BOOLEAN NOT NULL DEFAULT true,
  "chuninOrderThreshold" INTEGER NOT NULL DEFAULT 3,
  "joninOrderThreshold" INTEGER NOT NULL DEFAULT 10,
  "hokageOrderThreshold" INTEGER NOT NULL DEFAULT 20,
  "chuninMultiplier" INTEGER NOT NULL DEFAULT 120,
  "joninMultiplier" INTEGER NOT NULL DEFAULT 150,
  "hokageMultiplier" INTEGER NOT NULL DEFAULT 200,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyProgramSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoyaltyProgramSettings_singletonKey_key" ON "LoyaltyProgramSettings"("singletonKey");
CREATE INDEX "Coupon_assignedUserId_idx" ON "Coupon"("assignedUserId");

ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_assignedUserId_fkey"
  FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
