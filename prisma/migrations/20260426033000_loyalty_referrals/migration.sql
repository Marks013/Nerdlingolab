CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'REWARDED', 'CANCELED');

ALTER TABLE "LoyaltyProgramSettings"
  ADD COLUMN "referralInviterBonusPoints" INTEGER NOT NULL DEFAULT 150,
  ADD COLUMN "referralInviteeBonusPoints" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "referralMinOrderCents" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ReferralCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Referral" (
  "id" TEXT NOT NULL,
  "inviterId" TEXT NOT NULL,
  "inviteeId" TEXT NOT NULL,
  "referralCode" TEXT NOT NULL,
  "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
  "qualifyingOrderId" TEXT,
  "inviterRewardPoints" INTEGER NOT NULL DEFAULT 0,
  "inviteeRewardPoints" INTEGER NOT NULL DEFAULT 0,
  "rewardedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralCode_userId_key" ON "ReferralCode"("userId");
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");
CREATE INDEX "ReferralCode_code_isActive_idx" ON "ReferralCode"("code", "isActive");
CREATE UNIQUE INDEX "Referral_inviteeId_key" ON "Referral"("inviteeId");
CREATE INDEX "Referral_inviterId_status_idx" ON "Referral"("inviterId", "status");
CREATE INDEX "Referral_referralCode_idx" ON "Referral"("referralCode");
CREATE INDEX "Referral_qualifyingOrderId_idx" ON "Referral"("qualifyingOrderId");

ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Referral" ADD CONSTRAINT "Referral_inviterId_fkey"
  FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Referral" ADD CONSTRAINT "Referral_inviteeId_fkey"
  FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Referral" ADD CONSTRAINT "Referral_qualifyingOrderId_fkey"
  FOREIGN KEY ("qualifyingOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
