import { expect, test } from "@playwright/test";
import { CouponType, PrismaClient, ProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("carrega a vitrine principal", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Produtos geek com cupons/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ver produtos/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ver Nerdcoins/i })).toBeVisible();
  await expect(page.getByAltText("NerdLingoLab").first()).toBeVisible();
  await expect(page.getByText("Loja geek com recompensas")).toBeVisible();
  await expect(page.getByText("Carrinho inteligente")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("Entrega acompanhada");
  await expect(page.getByRole("contentinfo")).toContainText("Pagamento seguro");
});

test("mantém páginas públicas essenciais acessíveis e em PT-BR", async ({ page }) => {
  const publicPages = [
    { path: "/produtos", heading: "Produtos" },
    { path: "/carrinho", heading: "Carrinho" },
    { path: "/checkout", heading: "Checkout" },
    { path: "/programa-de-fidelidade", heading: "Programa de Fidelidade" }
  ];

  for (const publicPage of publicPages) {
    await page.goto(publicPage.path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { exact: true, name: publicPage.heading })).toBeVisible();
  }
});

test("cobre seções visuais de produtos e fidelidade", async ({ page }) => {
  await page.goto("/produtos");
  await expect(page.getByText(/seleções especiais da NerdLingoLab/i)).toBeVisible();
  await expect(page.getByLabel("Benefícios NerdLingoLab")).toContainText("Entrega acompanhada");
  await expect(page.getByLabel("Benefícios NerdLingoLab")).toContainText("Nerdcoins");

  await page.goto("/programa-de-fidelidade");
  await expect(page.getByText(/Acumule Nerdcoins/i)).toBeVisible();
  await expect(page.getByText("Ganhe pontos")).toBeVisible();
  await expect(page.getByText("Resgate no checkout")).toBeVisible();
  await expect(page.getByText("Histórico claro")).toBeVisible();
});

test("filtra catálogo público com dados reais do banco", async ({ page }) => {
  const suffix = Date.now().toString();
  const categorySlug = `categoria-filtro-${suffix}`;
  const productSlug = `produto-filtro-${suffix}`;
  const productTitle = `Filtro Galáctico ${suffix}`;

  try {
    const category = await prisma.category.create({
      data: {
        isActive: true,
        name: `Categoria Filtro ${suffix}`,
        slug: categorySlug
      }
    });

    await prisma.product.create({
      data: {
        categoryId: category.id,
        description: "Produto criado para validar busca pública com banco real.",
        images: ["/shopify/product-1.webp"],
        priceCents: 4590,
        publishedAt: new Date(),
        shortDescription: "Busca pública validada.",
        slug: productSlug,
        status: ProductStatus.ACTIVE,
        title: productTitle,
        variants: {
          create: {
            isActive: true,
            priceCents: 4590,
            sku: `SKU-FILTRO-${suffix}`,
            stockQuantity: 3,
            title: "Padrão"
          }
        }
      }
    });

    await page.goto(`/produtos?busca=${encodeURIComponent(productTitle)}&categoria=${categorySlug}&ordem=menor-valor`);
    await expect(page.getByLabel("Buscar")).toHaveValue(productTitle);
    await expect(page.getByLabel("Categoria")).toHaveValue(categorySlug);
    await expect(page.getByLabel("Ordenar")).toHaveValue("menor-valor");
    await expect(page.getByText("1 produto encontrado.")).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(productTitle) })).toBeVisible();

    await page.goto(`/produtos?busca=${encodeURIComponent(`Produto inexistente ${suffix}`)}`);
    await expect(page.getByText("Nenhum produto encontrado com esses filtros.")).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(productTitle) })).toHaveCount(0);
  } finally {
    await prisma.product.deleteMany({ where: { slug: productSlug } });
    await prisma.category.deleteMany({ where: { slug: categorySlug } });
  }
});

test("seleciona variante real do produto antes de adicionar ao carrinho", async ({ page }) => {
  const suffix = Date.now().toString();
  const categorySlug = `categoria-variante-${suffix}`;
  const productSlug = `produto-variante-${suffix}`;
  const productTitle = `Produto com Variante ${suffix}`;

  try {
    const category = await prisma.category.create({
      data: {
        isActive: true,
        name: `Categoria Variante ${suffix}`,
        slug: categorySlug
      }
    });

    await prisma.product.create({
      data: {
        categoryId: category.id,
        description: "Produto criado para validar seleção de variantes com carrinho real.",
        images: ["/shopify/product-1.webp"],
        priceCents: 3990,
        publishedAt: new Date(),
        shortDescription: "Seleção de opção validada.",
        slug: productSlug,
        status: ProductStatus.ACTIVE,
        title: productTitle,
        variants: {
          create: [
            {
              isActive: true,
              priceCents: 3990,
              sku: `SKU-VAR-PADRAO-${suffix}`,
              stockQuantity: 2,
              title: "Padrão"
            },
            {
              compareAtPriceCents: 7990,
              isActive: true,
              priceCents: 6990,
              sku: `SKU-VAR-ESPECIAL-${suffix}`,
              stockQuantity: 4,
              title: "Edição especial"
            }
          ]
        }
      }
    });

    await page.goto(`/produtos/${productSlug}`);
    await expect(page.getByRole("heading", { name: productTitle })).toBeVisible();
    await expect(page.getByLabel("Valor selecionado")).toContainText("R$ 39,90");

    await page.getByLabel(/Edição especial/).check();
    await expect(page.getByLabel("Valor selecionado")).toContainText("R$ 69,90");
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
    await page.getByRole("link", { name: "Ver carrinho" }).click();

    await expect(page.getByText(productTitle)).toBeVisible();
    await expect(page.getByText("Edição especial")).toBeVisible();
    await expect(page.getByText("R$ 69,90").first()).toBeVisible();
  } finally {
    await prisma.product.deleteMany({ where: { slug: productSlug } });
    await prisma.category.deleteMany({ where: { slug: categorySlug } });
  }
});

test("exibe ofertas públicas a partir de cupom e produto reais", async ({ page }) => {
  const suffix = Date.now().toString();
  const categorySlug = `categoria-oferta-${suffix}`;
  const productSlug = `produto-oferta-${suffix}`;
  const productTitle = `Oferta Relâmpago ${suffix}`;
  const couponCode = `OFERTA${suffix.slice(-6)}`;

  try {
    const category = await prisma.category.create({
      data: {
        isActive: true,
        name: `Categoria Oferta ${suffix}`,
        slug: categorySlug
      }
    });

    await prisma.coupon.create({
      data: {
        code: couponCode,
        isActive: true,
        minSubtotalCents: 3000,
        type: CouponType.PERCENTAGE,
        value: 15
      }
    });

    await prisma.product.create({
      data: {
        categoryId: category.id,
        compareAtPriceCents: 8990,
        description: "Produto criado para validar ofertas públicas com dados reais.",
        images: ["/shopify/product-1.webp"],
        priceCents: 6990,
        publishedAt: new Date(),
        shortDescription: "Oferta pública validada.",
        slug: productSlug,
        status: ProductStatus.ACTIVE,
        title: productTitle,
        variants: {
          create: {
            isActive: true,
            priceCents: 6990,
            sku: `SKU-OFERTA-${suffix}`,
            stockQuantity: 5,
            title: "Padrão"
          }
        }
      }
    });

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Ofertas NerdLingoLab" })).toBeVisible();
    await expect(page.getByText(couponCode)).toBeVisible();
    await expect(page.getByText("15% de desconto")).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(productTitle) })).toBeVisible();
  } finally {
    await prisma.product.deleteMany({ where: { slug: productSlug } });
    await prisma.coupon.deleteMany({ where: { code: couponCode } });
    await prisma.category.deleteMany({ where: { slug: categorySlug } });
  }
});

test("exibe recomendações apenas com produtos ativos e com estoque", async ({ page }) => {
  const suffix = Date.now().toString();
  const categorySlug = `categoria-recomendacao-${suffix}`;
  const mainSlug = `produto-principal-${suffix}`;
  const recommendedSlug = `produto-recomendado-${suffix}`;
  const unavailableSlug = `produto-sem-estoque-${suffix}`;
  const draftSlug = `produto-rascunho-${suffix}`;
  const mainTitle = `Produto Principal ${suffix}`;
  const recommendedTitle = `Produto Recomendado ${suffix}`;
  const unavailableTitle = `Produto Sem Estoque ${suffix}`;
  const draftTitle = `Produto Rascunho ${suffix}`;

  try {
    const category = await prisma.category.create({
      data: {
        isActive: true,
        name: `Categoria Recomendação ${suffix}`,
        slug: categorySlug
      }
    });

    await prisma.product.createMany({
      data: [
        {
          categoryId: category.id,
          description: "Produto principal para recomendações.",
          images: ["/shopify/product-1.webp"],
          priceCents: 4990,
          publishedAt: new Date(),
          shortDescription: "Principal.",
          slug: mainSlug,
          status: ProductStatus.ACTIVE,
          title: mainTitle
        },
        {
          categoryId: category.id,
          description: "Produto recomendado com estoque.",
          images: ["/shopify/product-1.webp"],
          priceCents: 5990,
          publishedAt: new Date(),
          shortDescription: "Recomendado.",
          slug: recommendedSlug,
          status: ProductStatus.ACTIVE,
          title: recommendedTitle
        },
        {
          categoryId: category.id,
          description: "Produto ativo sem estoque.",
          images: ["/shopify/product-1.webp"],
          priceCents: 3990,
          publishedAt: new Date(),
          shortDescription: "Sem estoque.",
          slug: unavailableSlug,
          status: ProductStatus.ACTIVE,
          title: unavailableTitle
        },
        {
          categoryId: category.id,
          description: "Produto em rascunho.",
          images: ["/shopify/product-1.webp"],
          priceCents: 2990,
          publishedAt: new Date(),
          shortDescription: "Rascunho.",
          slug: draftSlug,
          status: ProductStatus.DRAFT,
          title: draftTitle
        }
      ]
    });

    const products = await prisma.product.findMany({
      where: { slug: { in: [mainSlug, recommendedSlug, unavailableSlug, draftSlug] } },
      select: { id: true, slug: true }
    });
    const productIdBySlug = new Map(products.map((product) => [product.slug, product.id]));

    await prisma.productVariant.createMany({
      data: [
        {
          isActive: true,
          priceCents: 4990,
          productId: productIdBySlug.get(mainSlug) ?? "",
          sku: `SKU-REC-MAIN-${suffix}`,
          stockQuantity: 2,
          title: "Padrão"
        },
        {
          isActive: true,
          priceCents: 5990,
          productId: productIdBySlug.get(recommendedSlug) ?? "",
          sku: `SKU-REC-OK-${suffix}`,
          stockQuantity: 3,
          title: "Padrão"
        },
        {
          isActive: true,
          priceCents: 3990,
          productId: productIdBySlug.get(unavailableSlug) ?? "",
          sku: `SKU-REC-ZERO-${suffix}`,
          stockQuantity: 0,
          title: "Padrão"
        },
        {
          isActive: true,
          priceCents: 2990,
          productId: productIdBySlug.get(draftSlug) ?? "",
          sku: `SKU-REC-DRAFT-${suffix}`,
          stockQuantity: 4,
          title: "Padrão"
        }
      ]
    });

    await page.goto(`/produtos/${mainSlug}`);

    await expect(page.getByRole("heading", { name: "Produtos recomendados" })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(recommendedTitle) })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(unavailableTitle) })).toHaveCount(0);
    await expect(page.getByRole("link", { name: new RegExp(draftTitle) })).toHaveCount(0);
  } finally {
    await prisma.product.deleteMany({
      where: { slug: { in: [mainSlug, recommendedSlug, unavailableSlug, draftSlug] } }
    });
    await prisma.category.deleteMany({ where: { slug: categorySlug } });
  }
});

test("redireciona área restrita para entrada", async ({ page }) => {
  await page.goto("/admin/dashboard");

  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: /Entrar no admin/i })).toBeVisible();
});

test("responde verificação de saúde", async ({ request }) => {
  const response = await request.get("/api/health");
  const payload = (await response.json()) as { ok?: boolean; service?: string };

  expect(response.ok()).toBe(true);
  expect(payload.ok).toBe(true);
  expect(payload.service).toBe("nerdlingolab-commerce");
});

test("responde prontidão com banco e armazenamento", async ({ request }) => {
  const response = await request.get("/api/health/ready");
  const payload = (await response.json()) as {
    checks?: Array<{ name?: string; ok?: boolean }>;
    ok?: boolean;
    service?: string;
  };

  expect(response.ok()).toBe(true);
  expect(payload.ok).toBe(true);
  expect(payload.service).toBe("nerdlingolab-commerce");
  expect(payload.checks).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "database", ok: true }),
      expect.objectContaining({ name: "storage", ok: true })
    ])
  );
});
