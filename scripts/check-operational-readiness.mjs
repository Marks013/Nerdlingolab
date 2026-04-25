import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDirectory = process.cwd();
const requiredFiles = [
  ".env.example",
  "docker-compose.yml",
  "docs/phases-consolidated-handoff.md",
  "prisma/schema.prisma",
  "prisma.config.ts",
  "src/proxy.ts",
  "src/app/api/health/route.ts",
  "src/app/api/health/ready/route.ts",
  "src/app/api/cart/validate/route.ts",
  "src/app/api/checkout/route.ts",
  "src/app/api/shipping/quote/route.ts",
  "src/app/api/webhooks/mercadopago/route.ts",
  "src/lib/cart/validation.ts",
  "src/lib/checkout/create-checkout.ts",
  "src/lib/payments/mercadopago-webhook.ts",
  "src/lib/payments/order-coupon.ts",
  "src/lib/payments/order-inventory.ts",
  "src/lib/payments/order-loyalty.ts",
  "src/lib/shipping/mercado-envios.ts",
  "src/lib/shipping/quotes.ts",
  "playwright.config.ts",
  "tests/e2e/checkout-db-flow.spec.ts",
  "tests/e2e/public-flow.spec.ts"
];

const requiredPackageScripts = [
  "validate:encoding",
  "validate:ui-copy",
  "validate:project",
  "prisma:generate",
  "db:migrate",
  "db:seed",
  "test:e2e",
  "check:operational"
];

const requiredEnvExampleKeys = [
  "APP_URL",
  "DATABASE_URL",
  "AUTH_SECRET",
  "SUPERADMIN_EMAIL",
  "SUPERADMIN_PASSWORD",
  "MINIO_BUCKET",
  "MERCADO_PAGO_ACCESS_TOKEN",
  "MERCADO_PAGO_WEBHOOK_SECRET",
  "MERCADO_ENVIOS_ACCESS_TOKEN",
  "RESEND_API_KEY",
  "SENTRY_DSN"
];

const prismaContractSnippets = [
  ["ProductStatus", "enum ProductStatus"],
  ["pedidos", "model Order"],
  ["itens de pedido", "model OrderItem"],
  ["cupons", "model Coupon"],
  ["resgates de cupom", "model CouponRedemption"],
  ["fidelidade", "model LoyaltyLedger"],
  ["inventário", "model InventoryLedger"],
  ["webhooks", "model WebhookEvent"],
  ["entregas", "model Shipment"],
  ["eventos de entrega", "model ShipmentEvent"],
  ["deduplicação de webhook", "@@unique([provider, externalEventId])"],
  ["idempotência financeira", "idempotencyKey"]
];

const criticalSourceContracts = [
  {
    filePath: "src/lib/checkout/create-checkout.ts",
    snippets: [
      ["revalidação do carrinho", "validateCartItems({"],
      ["entrega obrigatória", "selectedShippingOption"],
      ["mock bloqueado em produção", "process.env.NODE_ENV !== \"production\""],
      ["Mercado Pago obrigatório fora de mock", "assertMercadoPagoConfigured()"]
    ]
  },
  {
    filePath: "src/lib/cart/validation.ts",
    snippets: [
      ["produto ativo", "ProductStatus.ACTIVE"],
      ["estoque disponível", "stockQuantity - variant.reservedQuantity"],
      ["preço vindo da variante", "unitPriceCents = variant.priceCents"],
      ["cupom server-side", "validateCoupon({"],
      ["fidelidade server-side", "validateLoyaltyRedemption({"],
      ["frete server-side", "selectShippingOption({"]
    ]
  },
  {
    filePath: "src/app/api/checkout/route.ts",
    snippets: [
      ["rate limit", "rateLimitRequest(request"],
      ["mesma origem", "assertSameOriginRequest(request)"],
      ["schema de checkout", "checkoutRequestSchema.safeParse"],
      ["captura Sentry", "Sentry.captureException(error)"]
    ]
  },
  {
    filePath: "src/app/api/webhooks/mercadopago/route.ts",
    snippets: [
      ["assinatura Mercado Pago", "verifyMercadoPagoWebhookSignature(request, payload)"],
      ["persistência do webhook", "prisma.webhookEvent.upsert"],
      ["deduplicação provider/evento", "provider_externalEventId"],
      ["processamento isolado", "processMercadoPagoPayment({"]
    ]
  },
  {
    filePath: "src/lib/payments/mercadopago-webhook.ts",
    snippets: [
      ["transação Prisma", "prisma.$transaction"],
      ["replay ignorado", "order.paymentStatus === PaymentStatus.APPROVED"],
      ["baixa de estoque", "decrementInventoryForOrder(tx, order)"],
      ["cupom idempotente", "registerOrderCouponRedemption(tx, order)"],
      ["fidelidade idempotente", "registerOrderLoyaltyLedger(tx, order)"],
      ["webhook processado", "WebhookStatus.PROCESSED"]
    ]
  },
  {
    filePath: "src/lib/payments/order-inventory.ts",
    snippets: [
      ["estoque atômico", "updateMany({"],
      ["proteção de estoque", "gte: item.quantity"],
      ["ledger idempotente", "idempotencyKey: `stock:${order.id}:${item.id}`"]
    ]
  },
  {
    filePath: "src/lib/payments/order-coupon.ts",
    snippets: [
      ["resgate idempotente", "couponRedemption.upsert"],
      ["chave de cupom", "idempotencyKey: `coupon:${order.id}:${order.couponId}`"]
    ]
  },
  {
    filePath: "src/lib/payments/order-loyalty.ts",
    snippets: [
      ["resgate idempotente", "idempotencyKey: `loyalty:redeem:${order.id}`"],
      ["ganho idempotente", "idempotencyKey: `loyalty:earn:${order.id}`"],
      ["pontos no pedido", "loyaltyPointsEarned"]
    ]
  },
  {
    filePath: "src/lib/shipping/mercado-envios.ts",
    snippets: [
      ["token Mercado Envios", "MERCADO_ENVIOS_ACCESS_TOKEN"],
      ["consulta shipment", "/shipments/${externalShipmentId}"],
      ["histórico de entrega", "/shipments/${externalShipmentId}/history"],
      ["eventos persistidos", "shipmentEvent.createMany"],
      ["pedido atualizado pela entrega", "updateOrderFromShipment(orderId, status)"]
    ]
  }
];

const e2eContractSnippets = [
  {
    filePath: "tests/e2e/checkout-db-flow.spec.ts",
    snippets: [
      ["checkout com banco real", "cria pedido pela loja e processa aprovação com banco real"],
      ["webhook aprovado", "processApprovedMercadoPagoPayment"],
      ["replay de webhook", "variantAfterReplay"],
      ["cupom não duplica", "couponAfterReplay.usedCount).toBe(1)"],
      ["inventário não duplica", "inventoryEntriesAfterReplay).toBe(1)"],
      ["fidelidade não duplica", "loyaltyEntriesAfterReplay).toBe(1)"],
      ["rastreamento manual", "Salvar rastreamento"]
    ]
  },
  {
    filePath: "tests/e2e/public-flow.spec.ts",
    snippets: [
      ["filtros públicos", "filtra catálogo público com dados reais do banco"],
      ["variantes reais", "seleciona variante real do produto antes de adicionar ao carrinho"],
      ["ofertas reais", "exibe ofertas públicas a partir de cupom e produto reais"],
      ["recomendações com estoque", "exibe recomendações apenas com produtos ativos e com estoque"]
    ]
  }
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return readFileSync(resolve(rootDirectory, filePath), "utf8");
}

function assertRequiredFiles() {
  const missingFiles = requiredFiles.filter((filePath) => !existsSync(resolve(rootDirectory, filePath)));

  if (missingFiles.length > 0) {
    throw new Error(`Arquivos ausentes: ${missingFiles.join(", ")}`);
  }
}

function assertPackageScripts() {
  const packageJson = readJson(resolve(rootDirectory, "package.json"));
  const scripts = packageJson.scripts ?? {};
  const missingScripts = requiredPackageScripts.filter((scriptName) => !scripts[scriptName]);

  if (missingScripts.length > 0) {
    throw new Error(`Scripts ausentes: ${missingScripts.join(", ")}`);
  }
}

function assertEnvExample() {
  const envExample = readText(".env.example");
  const missingKeys = requiredEnvExampleKeys.filter((key) => !envExample.includes(`${key}=`));

  if (missingKeys.length > 0) {
    throw new Error(`Variáveis ausentes no .env.example: ${missingKeys.join(", ")}`);
  }
}

function assertPrismaSchemaContracts() {
  const schema = readText("prisma/schema.prisma");
  const missingContracts = prismaContractSnippets
    .filter(([, snippet]) => !schema.includes(snippet))
    .map(([label]) => label);

  if (missingContracts.length > 0) {
    throw new Error(`Contratos Prisma ausentes: ${missingContracts.join(", ")}`);
  }
}

function assertSourceContracts(contractGroups, groupLabel) {
  const failures = [];

  for (const contractGroup of contractGroups) {
    const source = readText(contractGroup.filePath);

    for (const [label, snippet] of contractGroup.snippets) {
      if (!source.includes(snippet)) {
        failures.push(`${contractGroup.filePath}: ${label}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`${groupLabel} ausentes:\n${failures.join("\n")}`);
  }
}

function assertPrismaClientGeneration() {
  if (process.platform === "win32") {
    execFileSync("cmd.exe", ["/d", "/s", "/c", "npm exec prisma generate"], {
      cwd: rootDirectory,
      stdio: "pipe"
    });
    return;
  }

  execFileSync("npm", ["exec", "prisma", "generate"], {
    cwd: rootDirectory,
    stdio: "pipe"
  });
}

try {
  assertRequiredFiles();
  assertPackageScripts();
  assertEnvExample();
  assertPrismaSchemaContracts();
  assertSourceContracts(criticalSourceContracts, "Contratos operacionais críticos");
  assertSourceContracts(e2eContractSnippets, "Coberturas E2E críticas");
  assertPrismaClientGeneration();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
