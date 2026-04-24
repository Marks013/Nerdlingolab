# Fase 2: App Shell e Integracoes Base

## Entregue

- App Router inicial com grupos `(shop)` e `(admin)`.
- Home da vitrine e pagina publica do programa de fidelidade.
- Login administrativo com Credentials Provider.
- Middleware protegendo rotas `/admin/*` para `ADMIN` e `SUPERADMIN`.
- Rota Auth.js em `/api/auth/[...nextauth]`.
- Rota `/api/health` para verificacao simples de disponibilidade.
- Singletons de `prisma`, Mercado Pago e MinIO.
- Tema Tailwind/Shadcn inicial inspirado no tema Shopify exportado.

## Limites intencionais

- CRUDs de catalogo, pedidos, cupons e fidelidade ainda nao foram implementados.
- A home ainda usa conteudo estrutural, nao dados reais do banco.
- Upload real para MinIO e checkout Mercado Pago ficam para fases posteriores.

## Proxima fase sugerida

Implementar Catalogo Admin + Catalogo Shop:

- CRUD de categorias, produtos e variantes.
- Upload de imagens para MinIO.
- Listagem publica com Server Components.
- Validacoes Zod e Server Actions tipadas.
