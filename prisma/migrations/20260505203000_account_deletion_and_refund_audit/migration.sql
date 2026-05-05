-- Preserve operational history when a customer account is permanently deleted.
ALTER TABLE "Order"
  ADD COLUMN "cancellationReason" TEXT,
  ADD COLUMN "canceledByUserId" TEXT,
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "refundAmountCents" INTEGER,
  ADD COLUMN "refundProviderId" TEXT,
  ADD COLUMN "refundStatus" TEXT,
  ADD COLUMN "refundIdempotencyKey" TEXT;

ALTER TABLE "ProductReview" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "ProductReview" DROP CONSTRAINT IF EXISTS "ProductReview_userId_fkey";
ALTER TABLE "ProductReview"
  ADD CONSTRAINT "ProductReview_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LoyaltyLedger" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "LoyaltyLedger" DROP CONSTRAINT IF EXISTS "LoyaltyLedger_userId_fkey";
ALTER TABLE "LoyaltyLedger"
  ADD CONSTRAINT "LoyaltyLedger_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
