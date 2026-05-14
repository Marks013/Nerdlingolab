ALTER TABLE "NewsletterCampaignDelivery"
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN "nextRetryAt" TIMESTAMP(3),
ADD COLUMN "processingStartedAt" TIMESTAMP(3);

CREATE INDEX "NewsletterCampaignDelivery_status_nextRetryAt_idx" ON "NewsletterCampaignDelivery"("status", "nextRetryAt");
CREATE INDEX "NewsletterCampaignDelivery_status_processingStartedAt_idx" ON "NewsletterCampaignDelivery"("status", "processingStartedAt");
CREATE INDEX "NewsletterCampaignDelivery_campaignId_status_idx" ON "NewsletterCampaignDelivery"("campaignId", "status");
