import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const rootDirectory = process.cwd();
const failures = [];

function readText(filePath) {
  return readFileSync(resolve(rootDirectory, filePath), "utf8");
}

function assertIncludes(filePath, checks) {
  const source = readText(filePath);

  for (const [label, snippet] of checks) {
    if (!source.includes(snippet)) {
      failures.push(`${filePath}: ${label}`);
    }
  }
}

function assertMutatingApiRoutes() {
  const apiRoot = resolve(rootDirectory, "src", "app", "api");
  const mutatingMethodPattern = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/;

  for (const filePath of walk(apiRoot)) {
    if (!filePath.endsWith("route.ts")) {
      continue;
    }

    const source = readFileSync(filePath, "utf8");
    const relativePath = relative(rootDirectory, filePath).replaceAll("\\", "/");

    if (!mutatingMethodPattern.test(source)) {
      continue;
    }

    if (!source.includes("rateLimitRequest(") && !relativePath.includes("/webhooks/")) {
      failures.push(`${relativePath}: mutação sem rateLimitRequest`);
    }

    if (!source.includes("Sentry.captureException")) {
      failures.push(`${relativePath}: mutação sem Sentry.captureException`);
    }

    if (!source.includes("safeParse") && !relativePath.includes("/webhooks/")) {
      failures.push(`${relativePath}: mutação sem validação de schema`);
    }
  }
}

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      yield* walk(filePath);
      continue;
    }

    yield filePath;
  }
}

assertIncludes("src/app/(admin)/admin/(panel)/layout.tsx", [
  ["painel admin protegido no layout", "await requireAdmin()"]
]);
assertIncludes("prisma/schema.prisma", [
  ["cupom tem visibilidade pública independente", "isPublic"],
  ["modelo de indicação", "model Referral"],
  ["código de indicação único", "model ReferralCode"],
  ["tema editável da vitrine", "model StorefrontTheme"],
  ["newsletter persistida", "model NewsletterSubscriber"],
  ["índice de cupom público", "@@index([isActive, isPublic])"],
  ["webhook deduplicado", "@@unique([provider, externalEventId])"],
  ["pedido tem idempotência de pagamento", "paymentIdempotencyKey"]
]);
assertIncludes("src/lib/offers/queries.ts", [
  ["consulta pública respeita isPublic", "isPublic: true"],
  ["consulta pública filtra cupom ativo", "isActive: true"]
]);
assertIncludes("src/features/coupons/components/coupon-manager.tsx", [
  ["admin controla publicação de cupom", "setCouponPublicVisibility"],
  ["form de cupom tem opção pública", "name=\"isPublic\""]
]);
assertIncludes("src/lib/cart/discounts.ts", [
  ["cupom limitado exige login", "Entre na conta para usar este cupom."],
  ["limite global validado no carrinho", "coupon.usedCount >= coupon.usageLimit"]
]);
assertIncludes("src/lib/payments/mercadopago-webhook.ts", [
  ["webhook valida total pago", "isPaymentAmountValid(payment, order.totalCents)"],
  ["webhook reprova valor divergente", "Valor pago não confere com o total do pedido."],
  ["processamento em transação", "prisma.$transaction"]
]);
assertIncludes("src/lib/payments/order-coupon.ts", [
  ["cupom incrementado com condição atômica", "tx.coupon.updateMany"],
  ["limite global conferido no pagamento", "Limite global de uso do cupom atingido."],
  ["resgate de cupom idempotente", "couponRedemption.upsert"]
]);
assertIncludes("src/actions/loyalty.ts", [
  ["admin salva configurações de fidelidade", "updateLoyaltySettings"],
  ["admin ajusta saldo com ledger", "adjustCustomerNerdcoins"],
  ["admin processa aniversário com idempotência anual", "loyalty:birthday:${today.year}:${user.id}"],
  ["admin expira pontos por lote", "expireEligibleNerdcoins"],
  ["admin gera códigos de indicação faltantes", "backfillReferralCodes"],
  ["rotina usa geração persistida de código", "ensureReferralCode(customer.id)"],
  ["expiração vinculada ao ledger original", "sourceLedgerId: lot.id"],
  ["configura recompensa para indicador", "referralInviterBonusPoints"],
  ["cliente converte pontos em cupom pessoal", "convertNerdcoinsToCoupon"],
  ["cupom vinculado ao cliente", "assignedUserId: session.user.id"]
]);
assertIncludes("src/actions/auth.ts", [
  ["cadastro aceita indicação", "referralCode"],
  ["gera código de indicação", "ensureReferralCode(user.id, tx)"],
  ["bônus do convidado", "loyalty:referral:invitee"]
]);
assertIncludes("src/app/(admin)/admin/(panel)/fidelidade/page.tsx", [
  ["painel central de fidelidade", "getAdminLoyaltyDashboard"],
  ["form de configurações", "updateLoyaltySettings"],
  ["ajuste manual", "adjustCustomerNerdcoins"],
  ["rotina de aniversário", "grantBirthdayNerdcoins"],
  ["rotina de expiração", "expireEligibleNerdcoins"],
  ["rotina de códigos de indicação", "backfillReferralCodes"],
  ["histórico de indicações", "recentReferrals"]
]);
assertIncludes("src/app/(admin)/admin/(panel)/tema/page.tsx", [
  ["editor de tema no admin", "updateStorefrontTheme"],
  ["restaura tema padrão", "resetStorefrontTheme"],
  ["edita aviso do topo", "announcementText"],
  ["edita dados do rodapé", "footerNotice"],
  ["edita slideshow principal", "group=\"hero\""],
  ["edita slideshow secundário", "group=\"promo\""],
  ["upload de imagem no editor de tema", "ThemeImageField"]
]);
assertIncludes("src/features/theme/components/theme-image-field.tsx", [
  ["uploader de imagem do tema", "/api/admin/uploads/product-image"],
  ["mensagem contra falha de upload", "Não foi possível enviar a imagem do tema."],
  ["botão acessível de upload", "aria-label={`Enviar ${label}`"]
]);
assertIncludes("src/lib/theme/storefront.ts", [
  ["fallback de slides principais", "defaultHeroSlides"],
  ["fallback de slides secundários", "defaultPromoSlides"],
  ["fallback de textos do tema", "defaultThemeText"],
  ["tema vem do banco", "prisma.storefrontTheme.findUnique"],
  ["tema resiliente sem migration", "getDefaultStorefrontTheme"],
  ["normaliza slides persistidos", "normalizeSlides"]
]);
assertIncludes("src/actions/storefront-theme.ts", [
  ["admin salva tema", "updateStorefrontTheme"],
  ["tema singleton", "singletonKey: \"default\""],
  ["admin salva textos do tema", "readThemeTextSettings"],
  ["revalida home", "revalidatePath(\"/\")"]
]);
assertIncludes("src/actions/newsletter.ts", [
  ["newsletter valida email", "newsletterSchema.safeParse"],
  ["newsletter persiste inscrição", "newsletterSubscriber.upsert"],
  ["admin gerencia status newsletter", "setNewsletterSubscriberStatus"],
  ["newsletter não silencia falha", "Não foi possível confirmar sua inscrição agora."]
]);
assertIncludes("src/lib/admin/newsletter.ts", [
  ["consulta inscritos newsletter", "getAdminNewsletterDashboard"],
  ["filtro por status newsletter", "filters.status === \"ativos\""],
  ["filtro por email newsletter", "contains: filters.query"]
]);
assertIncludes("src/app/(admin)/admin/(panel)/newsletter/page.tsx", [
  ["painel admin newsletter", "Newsletter"],
  ["lista inscritos newsletter", "dashboard.subscribers.map"],
  ["ativa e desativa inscrito", "setNewsletterSubscriberStatus"],
  ["edita chamada pelo tema", "/admin/tema"]
]);
assertIncludes("src/components/admin/admin-shell.tsx", [
  ["menu admin newsletter", "/admin/newsletter"],
  ["menu admin tema", "/admin/tema"]
]);
assertIncludes("src/lib/dashboard/queries.ts", [
  ["dashboard conta newsletter", "newsletterSubscriber.count"],
  ["métrica newsletter ativa", "newsletterActiveCount"]
]);
assertIncludes("src/app/(admin)/admin/(panel)/dashboard/page.tsx", [
  ["dashboard mostra newsletter", "Newsletter"],
  ["dashboard mostra inscritos ativos", "newsletterActiveCount"]
]);
assertIncludes("src/features/newsletter/components/newsletter-form.tsx", [
  ["newsletter usa server action", "subscribeNewsletter"],
  ["newsletter mostra feedback de envio", "state.message"],
  ["newsletter bloqueia botão enviando", "status.pending"]
]);
assertIncludes("src/app/(shop)/layout.tsx", [
  ["layout da loja é dinâmico", "export const dynamic = \"force-dynamic\""],
  ["layout carrega tema da loja", "getStorefrontTheme"],
  ["header recebe aviso editável", "announcementText={theme.announcementText}"],
  ["footer recebe tema editável", "theme={theme}"]
]);
assertIncludes("src/components/shop/shop-footer.tsx", [
  ["newsletter funcional no rodapé", "NewsletterForm"],
  ["rodapé usa email do tema", "theme.supportEmail"],
  ["rodapé usa Instagram do tema", "theme.instagramUrl"],
  ["selo Norton visual", "NortonLogo"],
  ["selo Reclame Aqui visual", "ReclameAquiLogo"],
  ["selo Google visual", "GoogleSafeLogo"],
  ["pagamento Mastercard visual", "MastercardLogo"],
  ["pagamento Visa visual", "VisaLogo"],
  ["pagamento Pix visual", "PixLogo"]
]);
assertIncludes("src/app/(shop)/conta/nerdcoins/page.tsx", [
  ["cliente vê saldo", "Saldo disponível"],
  ["cliente vê progresso VIP", "getVipProgress"],
  ["cliente vê link de indicação", "buildReferralSignupUrl"],
  ["cliente gera cupom", "convertNerdcoinsToCoupon"],
  ["cupons pessoais", "assignedUserId: session.user.id"]
]);
assertIncludes("src/lib/payments/order-rewards.ts", [
  ["recompensa indicação na primeira compra", "registerReferralReward"],
  ["indicação idempotente", "loyalty:referral:inviter:${referral.id}"],
  ["status recompensado", "ReferralStatus.REWARDED"]
]);
assertIncludes("src/features/catalog/components/product-detail-shell.tsx", [
  ["imagem inicial prioriza variante", "getVariantDisplayImage(initialVariant"],
  ["troca de variante troca imagem", "setSelectedImageUrl(getVariantDisplayImage"],
  ["tamanho herda imagem da cor", "getVariantColor(candidate) === color"],
  ["favorito real no detalhe do produto", "FavoriteButton"]
]);
assertIncludes("src/features/catalog/components/product-purchase-panel.tsx", [
  ["cor preserva tamanho quando possível", "getBestVariantForColor"],
  ["opções toleram chaves importadas", "normalizeOptionKey"]
]);
assertIncludes("src/features/catalog/components/product-table.tsx", [
  ["admin mostra resumo dos produtos", "totalVariants"],
  ["admin sincroniza CSV Shopify", "syncShopifyProductsFromCsv"],
  ["admin mostra imagem importada", "getPrimaryProductImage"],
  ["admin filtra produtos por busca", "name=\"busca\""],
  ["admin filtra produtos por status", "name=\"status\""],
  ["admin filtra produtos por categoria", "name=\"categoria\""]
]);
assertIncludes("src/lib/catalog/queries.ts", [
  ["admin aceita filtros de produto", "AdminProductFilters"],
  ["admin busca por sku", "sku: { contains: query"],
  ["admin filtra status", "status: filters.status"]
]);
assertIncludes("src/actions/catalog.ts", [
  ["sync Shopify usa script oficial", "\"import:shopify\""],
  ["sync Shopify funciona no Windows", "\"npm.cmd\""]
]);
assertIncludes("src/features/catalog/components/product-form.tsx", [
  ["admin orienta imagem por variante", "_imageUrl=/uploads/azul.webp"]
]);
assertIncludes("scripts/audit-runtime-ui.mjs", [
  ["auditoria cobre newsletter admin", "\"/admin/newsletter\""],
  ["auditoria cobre editor de tema", "\"/admin/tema\""],
  ["auditoria cobre suporte admin", "\"/admin/suporte\""]
]);
assertIncludes("src/app/(admin)/admin/(panel)/dashboard/page.tsx", [
  ["dashboard mostra pedidos recentes", "Pedidos recentes"],
  ["dashboard mostra estoque crítico", "Estoque em atenção"],
  ["dashboard mostra suporte aberto", "Suporte aberto"],
  ["dashboard mostra cupons públicos", "Cupons públicos"]
]);
assertIncludes("src/lib/loyalty/settings.ts", [
  ["configuração singleton", "singletonKey: \"default\""],
  ["cálculo de nível", "calculateTier"],
  ["cálculo de pontos", "calculateEarnedPoints"],
  ["progresso VIP", "getVipProgress"],
  ["validade de pontos", "getPointsExpirationDate"]
]);
assertIncludes("src/lib/checkout/create-checkout.ts", [
  ["carrinho revalidado no checkout", "validateCartItems({"],
  ["estoque reservado antes do pagamento", "reserveInventoryForCheckout(tx, validatedCart.items)"],
  ["reserva liberada se preferência falhar", "releaseInventoryReservations(tx, reservationItems)"],
  ["mock bloqueado em produção", "process.env.NODE_ENV !== \"production\""],
  ["Mercado Pago obrigatório", "assertMercadoPagoConfigured()"]
]);
assertIncludes("src/lib/inventory/reservations.ts", [
  ["reserva usa trava otimista", "reservedQuantity: variant.reservedQuantity"],
  ["reserva valida estoque disponível", "nextReservedQuantity > variant.stockQuantity"],
  ["liberação decrementa reservado", "reservedQuantity: {\n          decrement: item.quantity"]
]);
assertIncludes("src/lib/payments/order-inventory.ts", [
  ["pagamento consome reserva", "reservedQuantity: {\n          decrement: item.quantity"],
  ["pagamento preserva compatibilidade sem reserva antiga", "fallbackUpdateResult"]
]);
assertIncludes("src/actions/orders.ts", [
  ["cancelamento libera reserva", "releaseInventoryReservations(tx, order.items)"],
  ["pedido cancelado cancela pagamento pendente", "paymentStatus: PaymentStatus.CANCELED"]
]);
assertIncludes("docker-compose.yml", [
  ["porta de app configurável para proxy", "APP_HOST_PORT"],
  ["bootstrap idempotente", "command: npm run db:bootstrap"],
  ["CSV Shopify embarcado", "SHOPIFY_PRODUCTS_CSV"]
]);
assertIncludes("tests/e2e/public-flow.spec.ts", [
  ["cupom oculto não aparece publicamente", "exibe em cupons apenas códigos publicados"]
]);
assertIncludes("tests/e2e/checkout-db-flow.spec.ts", [
  ["webhook de teste informa valor pago", "transaction_amount: order.totalCents / 100"],
  ["replay não duplica cupom", "couponAfterReplay.usedCount).toBe(1)"]
]);
assertMutatingApiRoutes();

if (failures.length > 0) {
  process.stderr.write(`Auditoria de contratos de e-commerce falhou:\n${failures.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write("Auditoria de contratos de e-commerce concluída.\n");
