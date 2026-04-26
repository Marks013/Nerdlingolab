# Fase 1: Fundacao e Infraestrutura

## Referencias usadas

- Tema tema legado anexado: paleta principal `#ff6902`, acento de checkout `#00badb`, neutros `#000000`, `#ffffff`, `#677279`, logos em `assets/header_logo.webp` e `assets/logo.webp`.
- Tema tema legado anexado: modulos existentes de cashback/provedor legado de fidelidade em `sections/provedor-legado-fidelidade-loyalty-page.liquid`, `snippets/provedor-legado-fidelidade-loyalty-header-points.liquid`, `snippets/provedor-legado-fidelidade-loyalty-mini-cart.liquid` e documentacao `assets/CASHBACK-ARCHITECTURE.md`.
- programa legado de fidelidade: pontos por compra, formas de resgate, cupons, referrals, VIP tiers, pagina de fidelidade, ajustes manuais, historico completo de atividade e suporte a timeline auditavel.

## Infraestrutura

- `docker-compose.yml` inicia Postgres 16 e MinIO com volumes nomeados, healthchecks, restart policy e variaveis obrigatorias para segredos.
- `.env.example` centraliza credenciais de banco, Auth.js, MinIO, Mercado Pago, Resend e Sentry.
- `next.config.mjs` ativa `standalone`, remove `poweredByHeader`, configura imagens remotas do MinIO e redirects iniciais.

## Banco de dados

- `prisma/schema.prisma` usa valores monetarios em centavos (`Int`) para evitar erro de arredondamento.
- Auth.js esta contemplado por `User`, `Account`, `Session` e `VerificationToken`.
- Catalogo possui `Category`, `Product`, `ProductVariant` e `InventoryLedger` para auditar entradas e baixas de estoque.
- Pedidos possuem snapshots de cliente/produto/endereco para preservar historico mesmo se o catalogo mudar.
- Mercado Pago fica preparado com campos de preference/payment id e `WebhookEvent` idempotente por provider + external event id.
- Cupons possuem validade, limite global, limite por cliente e historico em `CouponRedemption`.
- Fidelidade replica o comportamento central do provedor legado de fidelidade com `LoyaltyPoints` como saldo agregado e `LoyaltyLedger` como livro-razao auditavel.

## Seed

- `prisma/seed.ts` cria o Superadmin a partir de `SUPERADMIN_EMAIL` e `SUPERADMIN_PASSWORD`.
- Se o usuario ja existir, o seed apenas garante o papel `SUPERADMIN`.
- O hash de senha usa `bcryptjs` com custo 12.

## Comandos

- `npm run setup`: gera Prisma Client, roda migrate dev e executa o seed.
- `npm run db:migrate`: cria/aplica migration local.
- `npm run db:deploy`: aplica migrations em ambiente de deploy.
- `npm run db:seed`: executa apenas o seed.
