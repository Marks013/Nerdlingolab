UPDATE "ProductShippingPreset"
SET "shippingLeadTimeDays" = 10,
    "updatedAt" = now()
WHERE "name" ILIKE ANY (ARRAY['%Melhor Envio%', '%Camiseta%', '%Action figure%', '%Action Figure%'])
  AND "shippingLeadTimeDays" < 10;

UPDATE "ProductVariant"
SET "shippingLeadTimeDays" = 10,
    "updatedAt" = now()
WHERE "shippingLeadTimeDays" IS NULL
   OR "shippingLeadTimeDays" < 10;
