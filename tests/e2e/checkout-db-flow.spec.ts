import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  CouponType,
  ProductStatus,
  WebhookProvider,
  WebhookStatus,
  PaymentStatus,
  OrderStatus,
  ShipmentStatus
} from "../../src/generated/prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "../../src/lib/prisma";
import { processApprovedMercadoPagoPayment } from "../../src/lib/payments/mercadopago-webhook";

const adminEmail = "admin-e2e@nerdlingolab.test";
const adminPassword = "NerdLingoLab#12345";

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.setTimeout(90_000);

test("cria pedido pela loja e processa aprovação com banco real", async ({ page }, testInfo) => {
  const suffix = testInfo.project.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const fixtures = await createCheckoutFixtures(suffix);

  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto(`/produtos/${fixtures.productSlug}`);
  await page.getByRole("button", { name: /Adicionar ao carrinho/i }).click();
  await Promise.all([
    page.waitForURL("**/carrinho"),
    page.getByRole("link", { name: "Ver carrinho" }).click()
  ]);

  await expect(page.getByText(fixtures.productTitle)).toBeVisible();
  await page.getByLabel("CEP").fill("01001000");
  await page.getByRole("button", { name: "Calcular" }).click();
  await expect(page.getByText("Entrega econômica")).toBeVisible();
  const couponInput = page.getByLabel("Cupom");
  await couponInput.fill(fixtures.couponCode);
  await expect(couponInput).toHaveValue(fixtures.couponCode);
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Cupom aplicado.")).toBeVisible();

  await Promise.all([
    page.waitForURL("**/checkout"),
    page.getByRole("link", { name: /Continuar para checkout/i }).click()
  ]);
  await expect(page.getByRole("heading", { exact: true, name: "Checkout" })).toBeVisible();
  await page.getByLabel("Nome completo").fill("Cliente Smoke Banco");
  await page.getByLabel("E-mail").fill(fixtures.customerEmail);
  await page.getByLabel("Telefone").fill("11999999999");
  await page.getByLabel("CPF").fill("12345678909");
  await page.getByLabel("CEP").fill("01001000");
  await page.getByLabel("Rua").fill("Praça da Sé");
  await page.getByLabel("Número").fill("100");
  await page.getByLabel("Bairro").fill("Sé");
  await page.getByLabel("Cidade").fill("São Paulo");
  await page.getByLabel("UF").fill("SP");
  await page.getByRole("button", { name: /Pagar com Mercado Pago/i }).click();

  await expect(page.getByText(/Pedido .* criado/i)).toBeVisible();

  const order = await prisma.order.findFirstOrThrow({
    where: { email: fixtures.customerEmail },
    include: { items: true },
    orderBy: { createdAt: "desc" }
  });
  await prisma.order.update({
    where: { id: order.id },
    data: { userId: fixtures.customerId }
  });
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: WebhookProvider.MERCADO_PAGO,
      externalEventId: `smoke-payment-${suffix}-${crypto.randomUUID()}`,
      payload: { source: "playwright" }
    }
  });

  await processApprovedMercadoPagoPayment({
    payment: {
      id: `smoke-payment-${suffix}`,
      status: "approved",
      external_reference: order.id,
      transaction_amount: order.totalCents / 100
    },
    paymentId: `smoke-payment-${suffix}`,
    webhookEventId: webhookEvent.id
  });

  const [paidOrder, variant, coupon, couponRedemptions, inventoryEntries, loyaltyEntries, processedWebhook] =
    await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      prisma.productVariant.findUniqueOrThrow({ where: { id: fixtures.variantId } }),
      prisma.coupon.findUniqueOrThrow({ where: { id: fixtures.couponId } }),
      prisma.couponRedemption.count({ where: { orderId: order.id } }),
      prisma.inventoryLedger.count({ where: { orderId: order.id } }),
      prisma.loyaltyLedger.count({ where: { orderId: order.id, userId: fixtures.customerId } }),
      prisma.webhookEvent.findUniqueOrThrow({ where: { id: webhookEvent.id } })
    ]);

  expect(paidOrder.status).toBe(OrderStatus.PAID);
  expect(paidOrder.paymentStatus).toBe(PaymentStatus.APPROVED);
  expect(paidOrder.discountCents).toBe(500);
  expect(paidOrder.shippingCents).toBe(1_490);
  expect(paidOrder.totalCents).toBe(5_990);
  expect(paidOrder.loyaltyPointsEarned).toBe(299);
  expect(variant.stockQuantity).toBe(4);
  expect(coupon.usedCount).toBe(1);
  expect(couponRedemptions).toBe(1);
  expect(inventoryEntries).toBe(1);
  expect(loyaltyEntries).toBe(1);
  expect(processedWebhook.status).toBe(WebhookStatus.PROCESSED);

  await processApprovedMercadoPagoPayment({
    payment: {
      id: `smoke-payment-${suffix}`,
      status: "approved",
      external_reference: order.id,
      transaction_amount: order.totalCents / 100
    },
    paymentId: `smoke-payment-${suffix}`,
    webhookEventId: webhookEvent.id
  });

  const [variantAfterReplay, couponAfterReplay, inventoryEntriesAfterReplay, loyaltyEntriesAfterReplay] =
    await Promise.all([
      prisma.productVariant.findUniqueOrThrow({ where: { id: fixtures.variantId } }),
      prisma.coupon.findUniqueOrThrow({ where: { id: fixtures.couponId } }),
      prisma.inventoryLedger.count({ where: { orderId: order.id } }),
      prisma.loyaltyLedger.count({ where: { orderId: order.id, userId: fixtures.customerId } })
    ]);

  expect(variantAfterReplay.stockQuantity).toBe(4);
  expect(couponAfterReplay.usedCount).toBe(1);
  expect(inventoryEntriesAfterReplay).toBe(1);
  expect(loyaltyEntriesAfterReplay).toBe(1);

  await ensureAdminUser();
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(adminEmail);
  await page.getByLabel("Senha").fill(adminPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  await page.goto(`/admin/pedidos/${order.id}`);
  await expect(page.getByText(order.orderNumber)).toBeVisible();
  await expect(page.getByText("Entrega econômica")).toBeVisible();
  await expect(page.getByText("R$ 14,90").first()).toBeVisible();
  await page.getByPlaceholder("Transportadora").fill("Correios");
  await page.getByPlaceholder("Código de rastreio").fill(`BR${suffix.replace(/-/g, "").toUpperCase()}123`);
  await page.getByPlaceholder("Link de acompanhamento").fill("https://rastreamento.correios.com.br/");
  await page.getByRole("button", { name: "Salvar rastreamento" }).click();
  await expect(page.getByText("Correios")).toBeVisible();
  await expect(page.getByText(`BR${suffix.replace(/-/g, "").toUpperCase()}123 · Enviado`)).toBeVisible();

  const shipment = await prisma.shipment.findFirstOrThrow({ where: { orderId: order.id } });

  expect(shipment.status).toBe(ShipmentStatus.SHIPPED);

  const reportYear = new Date().getFullYear();
  await page.goto(`/admin/relatorios?inicio=${reportYear}-01-01&fim=${reportYear}-12-31`);
  await expect(page.getByRole("heading", { name: "Relatórios" })).toBeVisible();
  await expect(page.getByLabel("Início")).toHaveValue(`${reportYear}-01-01`);
  await expect(page.getByLabel("Fim")).toHaveValue(`${reportYear}-12-31`);
  await expect(page.getByText("Pedidos pagos")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Exportar CSV" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();

  expect(download.suggestedFilename()).toBe(`relatorio-${reportYear}-01-01-${reportYear}-12-31.csv`);
  expect(downloadPath).not.toBeNull();
  expect(readFileSync(downloadPath ?? "", "utf8")).toContain("Receita,Pedidos pagos");
});

async function ensureAdminUser(): Promise<void> {
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Admin E2E",
      passwordHash,
      role: "SUPERADMIN",
      loyaltyPoints: { create: {} }
    },
    update: {
      passwordHash,
      role: "SUPERADMIN"
    }
  });
}

async function createCheckoutFixtures(suffix: string): Promise<{
  categoryId: string;
  couponCode: string;
  couponId: string;
  customerEmail: string;
  customerId: string;
  productSlug: string;
  productTitle: string;
  variantId: string;
}> {
  const productSlug = `smoke-produto-banco-${suffix}`;
  const productTitle = `Produto Smoke Banco ${suffix}`;
  const couponCode = `SMOKE${suffix.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const customerEmail = `cliente-smoke-${suffix}@nerdlingolab.test`;

  await cleanupFixtures({ couponCode, customerEmail, productSlug });

  const category = await prisma.category.create({
    data: {
      name: `Smoke ${suffix}`,
      slug: `smoke-${suffix}`,
      isActive: true
    }
  });
  const product = await prisma.product.create({
    data: {
      categoryId: category.id,
      title: productTitle,
      slug: productSlug,
      description: "Produto criado para validar o fluxo real de compra.",
      shortDescription: "Compra validada com banco real.",
      status: ProductStatus.ACTIVE,
      images: [],
      priceCents: 5_000,
      publishedAt: new Date(),
      variants: {
        create: {
          title: "Padrão",
          sku: `SMOKE-${suffix}`.toUpperCase(),
          priceCents: 5_000,
          stockQuantity: 5,
          isActive: true
        }
      }
    },
    include: { variants: true }
  });
  const coupon = await prisma.coupon.create({
    data: {
      code: couponCode,
      type: CouponType.FIXED_AMOUNT,
      value: 500,
      isActive: true
    }
  });
  const customer = await prisma.user.create({
    data: {
      email: customerEmail,
      name: "Cliente Smoke Banco",
      loyaltyPoints: { create: { balance: 0 } }
    }
  });

  return {
    categoryId: category.id,
    couponCode,
    couponId: coupon.id,
    customerEmail,
    customerId: customer.id,
    productSlug,
    productTitle,
    variantId: product.variants[0].id
  };
}

async function cleanupFixtures({
  couponCode,
  customerEmail,
  productSlug
}: {
  couponCode: string;
  customerEmail: string;
  productSlug: string;
}): Promise<void> {
  const orders = await prisma.order.findMany({
    where: { OR: [{ email: customerEmail }, { items: { some: { product: { slug: productSlug } } } }] },
    select: { id: true }
  });
  const orderIds = orders.map((order) => order.id);
  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    select: {
      id: true,
      categoryId: true,
      variants: {
        select: { id: true }
      }
    }
  });
  const variantIds = product?.variants.map((variant) => variant.id) ?? [];
  const inventoryCleanupFilters = [
    { orderId: { in: orderIds } },
    ...(product ? [{ productId: product.id }] : []),
    ...(variantIds.length > 0 ? [{ variantId: { in: variantIds } }] : [])
  ];
  const customer = await prisma.user.findUnique({
    where: { email: customerEmail },
    select: { id: true }
  });
  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode },
    select: { id: true }
  });

  await prisma.webhookEvent.deleteMany({ where: { externalEventId: { contains: couponCode.toLowerCase() } } });
  await prisma.shipmentEvent.deleteMany({ where: { shipment: { orderId: { in: orderIds } } } });
  await prisma.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.inventoryLedger.deleteMany({
    where: {
      OR: inventoryCleanupFilters
    }
  });
  await prisma.loyaltyLedger.deleteMany({
    where: { OR: [{ orderId: { in: orderIds } }, { userId: customer?.id }] }
  });
  await prisma.couponRedemption.deleteMany({
    where: { OR: [{ orderId: { in: orderIds } }, { couponId: coupon?.id }] }
  });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.coupon.deleteMany({ where: { code: couponCode } });
  await prisma.loyaltyPoints.deleteMany({ where: { userId: customer?.id } });
  await prisma.user.deleteMany({ where: { email: customerEmail } });
  if (!product) {
    return;
  }

  await prisma.productVariant.deleteMany({ where: { productId: product.id } });
  await prisma.product.deleteMany({ where: { slug: productSlug } });

  if (product.categoryId) {
    await prisma.category.deleteMany({ where: { id: product.categoryId } });
  }
}
