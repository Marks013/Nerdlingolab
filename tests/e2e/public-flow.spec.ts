import { expect, test } from "@playwright/test";
import { CouponType, PrismaClient, ProductStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

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

test("usa endereço salvo da conta no checkout", async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000);
  const suffix = `${Date.now()}-${testInfo.project.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
  const email = `endereco-${suffix}@nerdlingolab.test`;
  const password = "NerdLingoLab#12345";
  const categorySlug = `categoria-endereco-${suffix}`;
  const productSlug = `produto-endereco-${suffix}`;
  const productTitle = `Produto com Endereço ${suffix}`;
  const addressLabel = `Casa E2E ${suffix}`;
  const profileCpf = `12345${Date.now().toString().slice(-6)}`;

  await cleanupSavedAddressFixtures({ email, productSlug });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        name: "Cliente Endereço",
        passwordHash,
        role: UserRole.SUPERADMIN,
        loyaltyPoints: { create: {} }
      }
    });
    const category = await prisma.category.create({
      data: {
        isActive: true,
        name: `Categoria Endereço ${suffix}`,
        slug: categorySlug
      }
    });
    await prisma.product.create({
      data: {
        categoryId: category.id,
        description: "Produto criado para validar endereço salvo no checkout.",
        images: ["/shopify/product-1.webp"],
        priceCents: 3490,
        publishedAt: new Date(),
        shortDescription: "Checkout com endereço salvo.",
        slug: productSlug,
        status: ProductStatus.ACTIVE,
        title: productTitle,
        variants: {
          create: {
            isActive: true,
            priceCents: 3490,
            sku: `SKU-ENDERECO-${suffix}`,
            stockQuantity: 3,
            title: "Padrão"
          }
        }
      }
    });

    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await page.goto("/admin/login");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.goto("/conta");
    await page.getByLabel("Nome").fill("Cliente Perfil Atualizado");
    await page.getByLabel("Telefone").fill("11977776666");
    await page.getByLabel("CPF").fill(profileCpf);
    await page.getByLabel("Nascimento").fill("1995-05-12");
    await page.getByRole("button", { name: "Salvar dados" }).click();
    await expect(page.getByRole("heading", { name: "Cliente Perfil Atualizado" })).toBeVisible();
    await expect(page.getByLabel("Telefone")).toHaveValue("11977776666");

    await page.getByLabel("Apelido").fill(addressLabel);
    await page.getByLabel("Destinatário").fill("Cliente Endereço");
    await page.getByLabel("CEP").fill("01001000");
    await page.getByLabel("Rua").fill("Praça da Sé");
    await page.getByLabel("Número").fill("200");
    await page.getByLabel("Bairro").fill("Sé");
    await page.getByLabel("Cidade").fill("São Paulo");
    await page.getByLabel("UF").fill("SP");
    await page.getByLabel("Endereço padrão").check();
    await page.getByRole("button", { name: "Salvar endereço" }).click();
    await expect(page.getByText(addressLabel)).toBeVisible();
    await expect(page.locator("span").filter({ hasText: "Endereço padrão" })).toBeVisible();

    await page.goto(`/produtos/${productSlug}`);
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
    await Promise.all([
      page.waitForURL("**/carrinho"),
      page.getByRole("link", { name: "Ver carrinho" }).click()
    ]);
    await page.getByLabel("CEP").fill("01001000");
    await page.getByRole("button", { name: "Calcular" }).click();
    await expect(page.getByText("Entrega econômica")).toBeVisible({ timeout: 15_000 });
    await Promise.all([
      page.waitForURL("**/checkout"),
      page.getByRole("link", { name: /Continuar para checkout/i }).click()
    ]);

    await expect(page.getByRole("heading", { exact: true, name: "Checkout" })).toBeVisible();
    await expect(page.getByText(addressLabel)).toBeVisible();
    await expect(page.getByLabel("CEP")).toHaveValue("01001000");
    await expect(page.getByLabel("Rua")).toHaveValue("Praça da Sé");
    await page.getByLabel("Nome completo").fill("Cliente Endereço");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Telefone").fill("11988887777");
    await page.getByLabel("CPF").fill("12345678909");
    await page.getByRole("button", { name: /Pagar com Mercado Pago/i }).click();
    await expect(page.getByText(/Pedido .* criado/i)).toBeVisible();

    const order = await prisma.order.findFirstOrThrow({
      where: { email },
      orderBy: { createdAt: "desc" }
    });
    const shippingAddress = order.shippingAddress as Record<string, unknown>;

    expect(order.userId).toBeTruthy();
    expect(order.shippingPostalCode).toBe("01001000");
    expect(shippingAddress.street).toBe("Praça da Sé");
    expect(shippingAddress.number).toBe("200");
    expect(shippingAddress.city).toBe("São Paulo");
    expect(shippingAddress.state).toBe("SP");

    const customer = await prisma.user.findUniqueOrThrow({ where: { email } });

    expect(customer.name).toBe("Cliente Perfil Atualizado");
    expect(customer.phone).toBe("11977776666");
    expect(customer.cpf).toBe(profileCpf);
    expect(customer.birthday?.toISOString().slice(0, 10)).toBe("1995-05-12");
  } finally {
    await cleanupSavedAddressFixtures({ email, productSlug });
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

async function cleanupSavedAddressFixtures({
  email,
  productSlug
}: {
  email: string;
  productSlug: string;
}): Promise<void> {
  const orders = await prisma.order.findMany({
    where: { OR: [{ email }, { items: { some: { product: { slug: productSlug } } } }] },
    select: { id: true }
  });
  const orderIds = orders.map((order) => order.id);
  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    select: { id: true, categoryId: true }
  });
  const variants = product
    ? await prisma.productVariant.findMany({
        where: { productId: product.id },
        select: { id: true }
      })
    : [];
  const variantIds = variants.map((variant) => variant.id);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (orderIds.length > 0) {
    await prisma.shipmentEvent.deleteMany({ where: { shipment: { orderId: { in: orderIds } } } });
    await prisma.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
  }

  if (orderIds.length > 0 || product || variantIds.length > 0) {
    await prisma.inventoryLedger.deleteMany({
      where: {
        OR: [
          { orderId: { in: orderIds } },
          ...(product ? [{ productId: product.id }] : []),
          { variantId: { in: variantIds } }
        ]
      }
    });
  }

  if (orderIds.length > 0 || user) {
    await prisma.loyaltyLedger.deleteMany({
      where: {
        OR: [
          { orderId: { in: orderIds } },
          ...(user ? [{ userId: user.id }] : [])
        ]
      }
    });
  }

  await prisma.couponRedemption.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });

  if (user) {
    await prisma.customerAddress.deleteMany({ where: { userId: user.id } });
    await prisma.loyaltyPoints.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
  }

  await prisma.user.deleteMany({ where: { email } });
  if (product) {
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
  }
  await prisma.product.deleteMany({ where: { slug: productSlug } });

  if (product?.categoryId) {
    await prisma.category.deleteMany({ where: { id: product.categoryId } });
  }
}
