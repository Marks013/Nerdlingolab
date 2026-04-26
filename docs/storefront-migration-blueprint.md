# Blueprint tema legado -> NerdLingoLab com base SavePointFinance

## Contexto

Este projeto substitui o tema legado exportado em:

`C:\Users\User\Desktop\theme_export__nerdlingolab-com-nerdlingolav-v11-9-5__24APR2026-1138am.zip`

O repositório de referência técnica foi clonado apenas para leitura em:

`C:\Users\User\Desktop\SavePointFinance-reference`

A intenção não é copiar o segmento financeiro, mas reaproveitar a robustez conquistada no SavePointFinance: organização, validações, auditorias, padrões de API, modelagem Prisma, fluxos protegidos e disciplina operacional.

## Estado atual do NerdLingoLab

- Stack principal: Next.js App Router, React, Prisma, NextAuth, Mercado Pago, Sentry, React Hook Form, Zod, TanStack Query, Recharts, Resend, React Email, MinIO e Zustand.
- Estrutura já separa loja, admin e APIs em `src/app/(shop)`, `src/app/(admin)` e `src/app/api`.
- Domínio de e-commerce já existe no Prisma: usuários, contas, endereços, categorias, produtos, variantes, estoque, pedidos, cupons, pontos de fidelidade e webhooks.
- Há verificações locais em `scripts/`: encoding, copy de UI, contraste, auditoria de rotas e prontidão operacional.
- Há E2E inicial em `tests/e2e/public-flow.spec.ts`.

## Inventário do tema legado exportado

O ZIP contém 202 arquivos:

- `assets`: 37 arquivos, incluindo CSS/JS customizados, logos, imagens de produto, badges de app, cashback e integrações.
- `sections`: 58 arquivos Liquid, incluindo header, footer, coleção, produto, carrinho, ofertas, newsletter, loyalty e cashback.
- `snippets`: 69 fragmentos Liquid.
- `templates`: 29 templates.
- `locales`: `pt-BR`, `en` e `es`.
- `config`: settings e markets.

## O que herdar do tema legado

- Identidade visual: logos, ícones, paleta real, imagens úteis e tom de comunicação.
- Estrutura comercial: home, coleções, produto, carrinho, cupons, fidelidade, ofertas, suporte e páginas institucionais.
- Regras de conteúdo: textos em português brasileiro, nomenclatura de benefícios, cashback/nerdcoins e mensagens de confiança.
- Assets reaproveitáveis: mover somente o que for usado para `public/`, com nomes normalizados e sem scripts legados desnecessários.

## O que herdar do SavePointFinance

- Separação clara entre rotas públicas, rotas protegidas, APIs e módulos de domínio.
- Scripts de auditoria operacional como primeiro nível de segurança antes de deploy.
- Uso disciplinado de Prisma para contratos de dados e histórico de eventos.
- Fluxos administrativos auditáveis.
- Webhooks persistidos com status e deduplicação.
- Build com checagens explícitas de ambiente.
- Smoke tests para integrações críticas.

## Estratégia recomendada

1. Consolidar identidade tema legado no Next.js
   - Extrair apenas assets úteis do tema.
   - Mapear seções Liquid para componentes React equivalentes.
   - Migrar primeiro header, footer, home, listagem de produtos, detalhe de produto, carrinho e fidelidade.

2. Fortalecer a base operacional
   - Adaptar a ideia dos audits do SavePointFinance para checkout, pedidos, estoque, cupons, fidelidade e Mercado Pago.
   - Expandir `check-operational-readiness.mjs` para validar variáveis obrigatórias de e-commerce.
   - Criar smoke tests para checkout e webhook de pagamento.

3. Migrar domínio de loja por fases
   - Catálogo e mídia de produtos.
   - Carrinho e validação de estoque.
   - Checkout Mercado Pago.
   - Pedidos e painel admin.
   - Cupons, cashback/nerdcoins e fidelidade.
   - Conta do cliente e histórico de pedidos.

4. Endurecer antes de publicar
   - Rodar `npm run validate:project`.
   - Rodar `npm run check:operational`.
   - Rodar `npm run test:e2e`.
   - Revisar contraste, copy, responsividade e rotas públicas.

## Guardrails

- Não importar Liquid como código de produção; usar o tema legado como referência visual e funcional.
- Não copiar regras financeiras do SavePointFinance; copiar padrões de engenharia.
- Não adicionar dependências novas sem necessidade real.
- Não migrar todos os assets do ZIP de uma vez; manter somente assets usados.
- Preservar comportamento de checkout, pedidos e webhooks com testes antes de refatorar.

## Próximos passos objetivos

1. Criar inventário detalhado dos assets tema legado que entram em `public/`.
2. Comparar a home tema legado com `src/app/(shop)/page.tsx`.
3. Definir componentes React equivalentes para as seções Liquid prioritárias.
4. Expandir os audits operacionais inspirados no SavePointFinance.
5. Rodar validações e corrigir regressões antes de qualquer deploy.

