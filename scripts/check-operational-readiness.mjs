import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDirectory = process.cwd();
const requiredFiles = [
  ".dockerignore",
  ".env.docker.example",
  ".env.example",
  "Dockerfile",
  "docker-compose.yml",
  "docs/phases-consolidated-handoff.md",
  "prisma/schema.prisma",
  "prisma.config.ts",
  "scripts/audit-runtime-ui.mjs",
  "scripts/audit-ecommerce-contracts.mjs",
  "src/proxy.ts",
  "src/app/api/health/route.ts",
  "src/app/api/health/ready/route.ts",
  "src/app/api/cart/validate/route.ts",
  "src/app/api/checkout/route.ts",
  "src/app/(admin)/admin/(panel)/fidelidade/page.tsx",
  "src/app/(admin)/admin/(panel)/tema/page.tsx",
  "src/app/(shop)/conta/nerdcoins/page.tsx",
  "src/actions/newsletter.ts",
  "src/app/(admin)/admin/(panel)/newsletter/page.tsx",
  "src/app/api/admin/reports/annual.csv/route.ts",
  "src/app/api/shipping/quote/route.ts",
  "src/app/api/webhooks/mercadopago/route.ts",
  "src/actions/account-addresses.ts",
  "src/actions/account-profile.ts",
  "src/actions/loyalty.ts",
  "src/lib/account/profile-schema.ts",
  "src/lib/addresses/schema.ts",
  "src/lib/cart/validation.ts",
  "src/lib/checkout/create-checkout.ts",
  "src/lib/loyalty/settings.ts",
  "src/lib/theme/storefront.ts",
  "src/features/newsletter/components/newsletter-form.tsx",
  "src/lib/admin/newsletter.ts",
  "src/lib/inventory/reservations.ts",
  "src/lib/payments/mercadopago-webhook.ts",
  "src/lib/payments/order-coupon.ts",
  "src/lib/payments/order-inventory.ts",
  "src/lib/payments/order-rewards.ts",
  "src/lib/shipping/mercado-envios.ts",
  "src/lib/shipping/quotes.ts",
  "playwright.config.ts",
  "tests/e2e/checkout-db-flow.spec.ts",
  "tests/e2e/public-flow.spec.ts"
];

const requiredPackageScripts = [
  "validate:encoding",
  "audit:ui-runtime",
  "audit:ecommerce",
  "validate:ui-copy",
  "validate:project",
  "prisma:generate",
  "db:migrate",
  "db:bootstrap",
  "db:seed",
  "import:shopify",
  "test:e2e",
  "check:operational"
];

const requiredEnvExampleKeys = [
  "APP_URL",
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_TRUST_HOST",
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
  ["configuração de bônus de cadastro", "signupBonusPoints"],
  ["configuração de bônus de aniversário", "birthdayBonusPoints"],
  ["modelo de indicação", "model Referral"],
  ["código de indicação", "model ReferralCode"],
  ["tema editável da vitrine", "model StorefrontTheme"],
  ["newsletter persistida", "model NewsletterSubscriber"],
  ["rastreamento de lote expirado", "sourceLedgerId"],
  ["endereços salvos", "model CustomerAddress"],
  ["inventário", "model InventoryLedger"],
  ["webhooks", "model WebhookEvent"],
  ["entregas", "model Shipment"],
  ["eventos de entrega", "model ShipmentEvent"],
  ["deduplicação de webhook", "@@unique([provider, externalEventId])"],
  ["idempotência financeira", "idempotencyKey"]
];

const criticalSourceContracts = [
  {
    filePath: "Dockerfile",
    snippets: [
      ["build reproduzível", "RUN npm ci"],
      ["build Next", "RUN npm run build"],
      ["runtime sem tarefas administrativas no start", "CMD [\"npm\", \"run\", \"start\"]"],
      ["scripts de bootstrap no runtime", "COPY --chown=node:node --from=builder /app/scripts ./scripts"],
      ["dados Shopify no runtime", "COPY --chown=node:node --from=builder /app/data ./data"],
      ["runtime sem root", "USER node"]
    ]
  },
  {
    filePath: "docker-compose.yml",
    snippets: [
      ["serviço da aplicação", "app:"],
      ["bootstrap operacional", "setup:"],
      ["bootstrap idempotente", "command: npm run db:bootstrap"],
      ["bucket MinIO", "minio-create-bucket:"],
      ["healthcheck readiness", "/api/health/ready"],
      ["host confiável Auth.js", "AUTH_TRUST_HOST"],
      ["endpoint interno MinIO", "MINIO_ENDPOINT: minio"],
      ["porta alternativa para proxy", "APP_HOST_PORT"],
      ["CSV Shopify embarcado", "SHOPIFY_PRODUCTS_CSV"]
    ]
  },
  {
    filePath: "package.json",
    snippets: [
      ["auditoria runtime de UI", "\"audit:ui-runtime\""],
      ["bootstrap de produção", "\"db:bootstrap\""],
      ["import Shopify", "\"import:shopify\""],
      ["override PostCSS", "\"postcss\": \"$postcss\""],
      ["override UUID", "\"uuid\": \"14.0.0\""]
    ]
  },
  {
    filePath: "scripts/audit-runtime-ui.mjs",
    snippets: [
      ["auditoria Playwright", "chromium.launch"],
      ["viewports desktop e mobile", "devices[\"Pixel 7\"]"],
      ["login admin", "loginAsAdmin"],
      ["overflow horizontal", "overflow horizontal"],
      ["controles acessíveis", "Controle sem nome acessível"],
      ["screenshots", "ui-runtime-audit"]
    ]
  },
  {
    filePath: "src/app/(shop)/page.tsx",
    snippets: [
      ["home dinâmica", "export const dynamic = \"force-dynamic\""],
      ["ofertas do banco", "getPublicOffers()"]
    ]
  },
  {
    filePath: "src/lib/reports/queries.ts",
    snippets: [
      ["filtros de período", "resolveReportFilters"],
      ["CSV de relatório", "buildAdminReportCsv"],
      ["pedidos pagos", "PaymentStatus.APPROVED"],
      ["período customizado", "startDate: string"]
    ]
  },
  {
    filePath: "src/app/api/admin/reports/annual.csv/route.ts",
    snippets: [
      ["sessão admin", "isAdminSession()"],
      ["exportação CSV", "text/csv; charset=utf-8"],
      ["filtros por URL", "requestUrl.searchParams.get(\"inicio\")"],
      ["nome do arquivo", "relatorio-${filters.startDate}-${filters.endDate}.csv"]
    ]
  },
  {
    filePath: "src/lib/checkout/create-checkout.ts",
    snippets: [
      ["revalidação do carrinho", "validateCartItems({"],
      ["reserva de estoque", "reserveInventoryForCheckout(tx, validatedCart.items)"],
      ["liberação de reserva em falha", "releaseInventoryReservations(tx, reservationItems)"],
      ["endereço salvo por usuário", "resolveShippingAddress(input)"],
      ["endereço salvo pertence ao usuário", "userId: input.userId"],
      ["entrega obrigatória", "selectedShippingOption"],
      ["mock bloqueado em produção", "process.env.NODE_ENV !== \"production\""],
      ["Mercado Pago obrigatório fora de mock", "assertMercadoPagoConfigured()"]
    ]
  },
  {
    filePath: "src/actions/account-profile.ts",
    snippets: [
      ["usuário autenticado", "requireCurrentUserId()"],
      ["schema de perfil", "customerProfileSchema.safeParse"],
      ["atualiza dados pessoais", "prisma.user.update"],
      ["revalida conta", "revalidatePath(\"/conta\")"]
    ]
  },
  {
    filePath: "src/actions/account-addresses.ts",
    snippets: [
      ["usuário autenticado", "requireCurrentUserId()"],
      ["transação para endereço padrão", "prisma.$transaction"],
      ["limpa padrão anterior", "isDefault: false"],
      ["revalida conta e checkout", "revalidatePath(\"/checkout\")"]
    ]
  },
  {
    filePath: "src/features/catalog/components/product-card.tsx",
    snippets: [
      ["imagem prioritária explícita", "imagePriority"],
      ["LCP com carregamento imediato", "loading={imagePriority ? \"eager\" : undefined}"],
      ["preload controlado", "preload={imagePriority}"]
    ]
  },
  {
    filePath: "src/features/cart/components/cart-line-item.tsx",
    snippets: [
      ["primeira imagem do carrinho", "imagePriority"],
      ["miniatura acima da dobra", "loading={imagePriority ? \"eager\" : undefined}"],
      ["preload do item principal", "preload={imagePriority}"]
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
    filePath: "src/actions/loyalty.ts",
    snippets: [
      ["configuração de bônus de cadastro", "signupBonusPoints"],
      ["configuração de indicação", "referralInviterBonusPoints"],
      ["backfill de indicações", "backfillReferralCodes"],
      ["gera códigos pendentes", "ensureReferralCode(customer.id)"],
      ["aniversário idempotente", "loyalty:birthday:${today.year}:${user.id}"],
      ["expiração idempotente", "loyalty:expire:${lot.id}"],
      ["lote de origem da expiração", "sourceLedgerId: lot.id"],
      ["revalidação de fidelidade", "revalidatePath(\"/admin/fidelidade\")"]
    ]
  },
  {
    filePath: "src/lib/catalog/queries.ts",
    snippets: [
      ["filtros admin de produtos", "AdminProductFilters"],
      ["busca por SKU no admin", "sku: { contains: query"],
      ["filtro de status no admin", "status: filters.status"]
    ]
  },
  {
    filePath: "src/actions/catalog.ts",
    snippets: [
      ["sincroniza Shopify pelo script oficial", "\"import:shopify\""],
      ["sincroniza Shopify no Windows", "\"npm.cmd\""]
    ]
  },
  {
    filePath: "src/app/(admin)/admin/(panel)/produtos/page.tsx",
    snippets: [
      ["admin produtos recebe filtros", "resolveAdminProductFilters"],
      ["admin produtos carrega categorias", "getAdminCategories()"],
      ["admin produtos aplica filtros", "getAdminProducts(filters)"]
    ]
  },
  {
    filePath: "src/features/catalog/components/product-form.tsx",
    snippets: [
      ["orienta imagem por variante", "_imageUrl=/uploads/azul.webp"]
    ]
  },
  {
    filePath: "src/app/(admin)/admin/(panel)/dashboard/page.tsx",
    snippets: [
      ["pedidos recentes no dashboard", "Pedidos recentes"],
      ["estoque crítico no dashboard", "Estoque em atenção"],
      ["suporte aberto no dashboard", "Suporte aberto"],
      ["cupons públicos no dashboard", "Cupons públicos"]
    ]
  },
  {
    filePath: "src/lib/theme/storefront.ts",
    snippets: [
      ["fallback de slideshow principal", "defaultHeroSlides"],
      ["fallback de slideshow secundário", "defaultPromoSlides"],
      ["fallback de textos do tema", "defaultThemeText"],
      ["tema no banco", "prisma.storefrontTheme.findUnique"],
      ["fallback se migration ainda não rodou", "getDefaultStorefrontTheme"],
      ["normalização de slides", "normalizeSlides"]
    ]
  },
  {
    filePath: "src/actions/storefront-theme.ts",
    snippets: [
      ["salva editor de tema", "updateStorefrontTheme"],
      ["restaura padrão", "resetStorefrontTheme"],
      ["tema singleton", "singletonKey: \"default\""],
      ["salva textos do tema", "readThemeTextSettings"],
      ["revalida home", "revalidatePath(\"/\")"]
    ]
  },
  {
    filePath: "src/actions/newsletter.ts",
    snippets: [
      ["validação de email newsletter", "newsletterSchema.safeParse"],
      ["newsletter persistida", "newsletterSubscriber.upsert"],
      ["admin muda status da newsletter", "setNewsletterSubscriberStatus"],
      ["falha visível ao cliente", "Não foi possível confirmar sua inscrição agora."]
    ]
  },
  {
    filePath: "src/lib/admin/newsletter.ts",
    snippets: [
      ["dashboard de newsletter", "getAdminNewsletterDashboard"],
      ["filtro por status", "filters.status === \"ativos\""],
      ["filtro por email", "contains: filters.query"]
    ]
  },
  {
    filePath: "src/app/(admin)/admin/(panel)/newsletter/page.tsx",
    snippets: [
      ["painel de newsletter", "Newsletter"],
      ["lista inscritos", "dashboard.subscribers.map"],
      ["ativa e desativa inscritos", "setNewsletterSubscriberStatus"],
      ["atalho para tema", "/admin/tema"]
    ]
  },
  {
    filePath: "src/components/admin/admin-shell.tsx",
    snippets: [
      ["menu newsletter", "/admin/newsletter"],
      ["menu tema", "/admin/tema"]
    ]
  },
  {
    filePath: "src/lib/dashboard/queries.ts",
    snippets: [
      ["contagem newsletter", "newsletterSubscriber.count"],
      ["métrica newsletter", "newsletterActiveCount"]
    ]
  },
  {
    filePath: "src/features/newsletter/components/newsletter-form.tsx",
    snippets: [
      ["server action no formulário", "subscribeNewsletter"],
      ["feedback de newsletter", "state.message"],
      ["botão bloqueia enviando", "status.pending"]
    ]
  },
  {
    filePath: "src/app/(shop)/layout.tsx",
    snippets: [
      ["layout dinâmico para tema no banco", "export const dynamic = \"force-dynamic\""],
      ["layout carrega tema", "getStorefrontTheme"],
      ["header configurável", "announcementText={theme.announcementText}"],
      ["footer configurável", "theme={theme}"]
    ]
  },
  {
    filePath: "src/components/shop/shop-footer.tsx",
    snippets: [
      ["newsletter funcional", "NewsletterForm"],
      ["email do tema", "theme.supportEmail"],
      ["instagram do tema", "theme.instagramUrl"],
      ["Norton visual", "NortonLogo"],
      ["Reclame Aqui visual", "ReclameAquiLogo"],
      ["Google seguro visual", "GoogleSafeLogo"],
      ["faixa de pagamentos visual", "PaymentBadgeStrip"]
    ]
  },
  {
    filePath: "src/components/shop/payment-badges.tsx",
    snippets: [
      ["Mastercard visual", "MastercardLogo"],
      ["Visa visual", "VisaLogo"],
      ["Pix visual", "PixLogo"]
    ]
  },
  {
    filePath: "src/app/(admin)/admin/(panel)/tema/page.tsx",
    snippets: [
      ["painel de tema", "Tema da vitrine"],
      ["aviso do topo editável", "announcementText"],
      ["rodapé editável", "footerNotice"],
      ["slideshow principal editável", "group=\"hero\""],
      ["slideshow secundário editável", "group=\"promo\""],
      ["upload no editor de tema", "ThemeImageField"],
      ["salva tema sem código", "updateStorefrontTheme"]
    ]
  },
  {
    filePath: "src/features/theme/components/theme-image-field.tsx",
    snippets: [
      ["usa upload admin existente", "/api/admin/uploads/product-image"],
      ["falha de upload visível", "Não foi possível enviar a imagem do tema."],
      ["controle acessível", "aria-label={`Enviar ${label}`"]
    ]
  },
  {
    filePath: "scripts/audit-runtime-ui.mjs",
    snippets: [
      ["audita admin newsletter", "\"/admin/newsletter\""],
      ["audita admin tema", "\"/admin/tema\""],
      ["audita admin suporte", "\"/admin/suporte\""]
    ]
  },
  {
    filePath: "src/lib/loyalty/settings.ts",
    snippets: [
      ["progresso VIP", "getVipProgress"],
      ["validade dos pontos", "getPointsExpirationDate"],
      ["limiar VIP por gasto", "getTierSpendThreshold"]
    ]
  },
  {
    filePath: "src/features/catalog/components/product-detail-shell.tsx",
    snippets: [
      ["imagem inicial da variante", "getVariantDisplayImage(initialVariant"],
      ["troca de variante atualiza foto", "setSelectedImageUrl(getVariantDisplayImage"],
      ["imagem herdada por cor", "getVariantColor(candidate) === color"],
      ["favorito funcional no detalhe", "FavoriteButton"]
    ]
  },
  {
    filePath: "src/features/catalog/components/product-purchase-panel.tsx",
    snippets: [
      ["cor preserva tamanho", "getBestVariantForColor"],
      ["chaves de opção normalizadas", "normalizeOptionKey"]
    ]
  },
  {
    filePath: "src/features/catalog/components/product-table.tsx",
    snippets: [
      ["produtos importados visíveis no admin", "getPrimaryProductImage"],
      ["sincroniza CSV Shopify", "syncShopifyProductsFromCsv"],
      ["resumo de variantes", "totalVariants"]
    ]
  },
  {
    filePath: "src/lib/loyalty/referrals.ts",
    snippets: [
      ["normaliza código", "normalizeReferralCode"],
      ["gera código único", "ensureReferralCode"],
      ["fallback persiste código", "referralCode.upsert"],
      ["monta link de cadastro", "buildReferralSignupUrl"]
    ]
  },
  {
    filePath: "src/lib/payments/order-rewards.ts",
    snippets: [
      ["recompensa indicação", "registerReferralReward"],
      ["primeira compra aprovada", "approvedOrderCount !== 1"],
      ["ledger idempotente da indicação", "loyalty:referral:inviter:${referral.id}"]
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
    filePath: "src/lib/payments/order-rewards.ts",
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
      ["relatórios com período", "/admin/relatorios?inicio="],
      ["exportação CSV", "Exportar CSV"],
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
      ["recomendações com estoque", "exibe recomendações apenas com produtos ativos e com estoque"],
      ["dados pessoais da conta", "Cliente Perfil Atualizado"],
      ["endereços salvos", "usa endereço salvo da conta no checkout"],
      ["prontidão banco e storage", "responde prontidão com banco e armazenamento"]
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
