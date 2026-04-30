ALTER TABLE "ProductVariant" ADD COLUMN "shippingLeadTimeDays" INTEGER;
ALTER TABLE "ProductShippingPreset" ADD COLUMN "shippingLeadTimeDays" INTEGER NOT NULL DEFAULT 0;

INSERT INTO "ProductShippingPreset" ("id", "name", "weightGrams", "heightCm", "widthCm", "lengthCm", "createdAt", "updatedAt")
VALUES
  ('preset_camisetas_padrao', 'Camisetas padrao', 250, 3, 25, 30, now(), now()),
  ('preset_action_figure_padrao', 'Action figure padrao', 450, 20, 16, 30, now(), now())
ON CONFLICT ("name") DO UPDATE SET
  "weightGrams" = EXCLUDED."weightGrams",
  "heightCm" = EXCLUDED."heightCm",
  "widthCm" = EXCLUDED."widthCm",
  "lengthCm" = EXCLUDED."lengthCm",
  "updatedAt" = now();

WITH matched_products AS (
  SELECT
    p.id,
    CASE
      WHEN concat_ws(' ', p.title, p.brand, c.name, c.slug, array_to_string(p.tags, ' ')) ILIKE ANY (
        ARRAY['%action figure%', '%action figures%', '%actionfigure%', '%boneco%', '%figura%', '%colecionavel%', '%colecionaveis%']
      ) THEN 'action_figure'
      WHEN concat_ws(' ', p.title, p.brand, c.name, c.slug, array_to_string(p.tags, ' ')) ILIKE ANY (
        ARRAY['%camiseta%', '%camisetas%', '%camisa%', '%camisas%', '%blusa%', '%blusas%', '%t-shirt%', '%tshirt%']
      ) THEN 'camiseta'
      ELSE NULL
    END AS preset
  FROM "Product" p
  LEFT JOIN "Category" c ON c.id = p."categoryId"
)
UPDATE "ProductVariant" v
SET
  "weightGrams" = CASE matched_products.preset
    WHEN 'action_figure' THEN 450
    ELSE 250
  END,
  "heightCm" = CASE matched_products.preset
    WHEN 'action_figure' THEN 20
    ELSE 3
  END,
  "widthCm" = CASE matched_products.preset
    WHEN 'action_figure' THEN 16
    ELSE 25
  END,
  "lengthCm" = CASE matched_products.preset
    WHEN 'action_figure' THEN 30
    ELSE 30
  END,
  "shippingLeadTimeDays" = 10,
  "updatedAt" = now()
FROM matched_products
WHERE matched_products.id = v."productId"
  AND matched_products.preset IS NOT NULL;
