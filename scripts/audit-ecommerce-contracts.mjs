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
