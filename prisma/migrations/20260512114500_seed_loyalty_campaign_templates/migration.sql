INSERT INTO "LoyaltyCampaign" (
  "id",
  "name",
  "description",
  "isActive",
  "showOnStorefront",
  "pointsMultiplier",
  "bonusPoints",
  "minSubtotalCents",
  "categoryIds",
  "productTags",
  "createdAt",
  "updatedAt"
) VALUES
  (
    'loyalty-missao-carrinho-geek-25',
    'Missao carrinho geek +25',
    'Ganhe 25 NerdCoins extras em pedidos aprovados acima de R$ 99,90.',
    true,
    true,
    100,
    25,
    9990,
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'loyalty-template-semana-anime-dobro',
    'Semana Anime em dobro',
    'Modelo de campanha para dobrar pontos em produtos com tag Anime.',
    false,
    true,
    200,
    0,
    0,
    ARRAY[]::TEXT[],
    ARRAY['anime', 'Anime']::TEXT[],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO NOTHING;
