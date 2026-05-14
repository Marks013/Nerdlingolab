ALTER TYPE "WebhookStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "WebhookStatus" ADD VALUE IF NOT EXISTS 'DEAD_LETTER';

ALTER TABLE "WebhookEvent"
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN "nextRetryAt" TIMESTAMP(3),
ADD COLUMN "processingStartedAt" TIMESTAMP(3);

CREATE INDEX "WebhookEvent_provider_status_nextRetryAt_idx" ON "WebhookEvent"("provider", "status", "nextRetryAt");
CREATE INDEX "WebhookEvent_provider_status_processingStartedAt_idx" ON "WebhookEvent"("provider", "status", "processingStartedAt");
