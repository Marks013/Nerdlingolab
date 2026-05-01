ALTER TABLE "Shipment" ADD COLUMN "overdueNotifiedAt" TIMESTAMP(3);

CREATE INDEX "Shipment_estimatedDeliveryAt_overdueNotifiedAt_idx"
  ON "Shipment"("estimatedDeliveryAt", "overdueNotifiedAt");
