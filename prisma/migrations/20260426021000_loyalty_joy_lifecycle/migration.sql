ALTER TABLE "LoyaltyProgramSettings"
  ADD COLUMN "signupBonusPoints" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "birthdayBonusPoints" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "chuninSpendThresholdCents" INTEGER NOT NULL DEFAULT 30000,
  ADD COLUMN "joninSpendThresholdCents" INTEGER NOT NULL DEFAULT 100000,
  ADD COLUMN "hokageSpendThresholdCents" INTEGER NOT NULL DEFAULT 200000;

ALTER TABLE "LoyaltyLedger"
  ADD COLUMN "sourceLedgerId" TEXT;

CREATE INDEX "LoyaltyLedger_sourceLedgerId_idx" ON "LoyaltyLedger"("sourceLedgerId");
