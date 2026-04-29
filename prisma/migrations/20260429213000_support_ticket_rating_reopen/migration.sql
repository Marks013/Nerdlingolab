ALTER TABLE "SupportTicket"
  ADD COLUMN "rating" INTEGER,
  ADD COLUMN "ratingComment" TEXT,
  ADD COLUMN "ratedAt" TIMESTAMP(3),
  ADD COLUMN "reopenReason" TEXT,
  ADD COLUMN "reopenedAt" TIMESTAMP(3),
  ADD COLUMN "reopenCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "SupportTicket_rating_ratedAt_idx" ON "SupportTicket"("rating", "ratedAt");
