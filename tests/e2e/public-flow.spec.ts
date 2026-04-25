import { expect, test } from "@playwright/test";
import { PrismaClient, ProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("carrega a vitrine principal", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /NerdLingoLab/i })).toBeVisible();
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
