# NerdLingoLab - Handoff consolidado sem contexto

Data do handoff: 24/04/2026

Use este arquivo como ponto de partida em um chat novo. Ele consolida as fases já feitas, decisões técnicas, validações, riscos e próximos passos.

Regra de manutenção: conforme o projeto avançar, este arquivo deve ser atualizado no mesmo turno com novas fases, decisões, validações, pendências e comandos executados. Ele é o controle principal para retomar o trabalho em um chat totalmente sem contexto.

## Atualização mais recente - recomendações de produto

Concluído nesta atualização:

- Criado `src/features/catalog/components/product-recommendations.tsx`.
- `src/lib/catalog/queries.ts` agora expõe recomendações públicas que excluem o produto atual, priorizam a mesma categoria e só retornam produtos ativos com estoque.
- A página de detalhe do produto mostra recomendações abaixo da compra.
- O E2E público cria produto principal, produto recomendado, produto sem estoque e produto em rascunho; valida que só o recomendado aparece.

Validações executadas:

- `npm run validate:project` passou.
- `npx playwright test tests/e2e/public-flow.spec.ts` passou com 18 testes em Chromium desktop e mobile.
- `npm run check:operational` passou.
- `npm run build` passou.
- `npm run test:e2e` passou com 20 testes em Chromium desktop e mobile.

Próximas pendências objetivas:

- Completar dados institucionais do footer quando CNPJ/endereço oficial forem definidos.
- Testar Mercado Envios com credencial e `shipment_id` reais.
- Expandir auditorias operacionais inspiradas no SavePointFinance para checkout, pedidos, estoque, cupons, fidelidade e Mercado Pago.

## Atualização mais recente - ofertas com dados reais

Concluído nesta atualização:

- Criado `src/lib/offers/queries.ts` para buscar cupons ativos e produtos promocionais com estoque.
- Criado `src/features/offers/components/public-offers-section.tsx`.
- A home agora exibe ofertas vindas do banco, com cupons ativos e produtos com valor promocional.
- A seção não importa Liquid nem blocos fixos do tema Shopify; usa dados reais e o carrinho continua revalidando cupom, estoque e valores.
- O E2E público cria cupom/produto reais, valida a seção de ofertas na home e limpa os dados ao final.

Validações executadas:

- `npm run validate:project` passou.
- `npx playwright test tests/e2e/public-flow.spec.ts` passou com 16 testes em Chromium desktop e mobile.
- `npm run check:operational` passou.
- `npm run build` passou.
- `npm run test:e2e` passou com 18 testes em Chromium desktop e mobile.

Próximas pendências objetivas:

- Completar dados institucionais do footer quando CNPJ/endereço oficial forem definidos.
- Testar Mercado Envios com credencial e `shipment_id` reais.

## Atualização mais recente - variações no produto

Concluído nesta atualização:

- Criado `src/features/catalog/components/product-purchase-panel.tsx`.
- A página de detalhe do produto agora permite escolher variantes reais ativas antes de adicionar ao carrinho.
- O valor exibido, disponibilidade, botão de compra e cálculo de frete mudam conforme a variante selecionada.
- O carrinho continua revalidando variante, estoque e valor no servidor em `/api/cart/validate`.
- O E2E público cria produto com duas variantes reais, escolhe a variante especial, adiciona ao carrinho e valida variante/valor no carrinho.

Validações executadas:

- `npm run validate:project` passou.
- `npx playwright test tests/e2e/public-flow.spec.ts` passou com 14 testes em Chromium desktop e mobile.
- `npm run check:operational` passou.
- `npm run build` passou.
- `npm run test:e2e` passou com 16 testes em Chromium desktop e mobile.

Próximas pendências objetivas:

- Completar dados institucionais do footer quando CNPJ/endereço oficial forem definidos.
- Testar Mercado Envios com credencial e `shipment_id` reais.

## Atualização mais recente - busca e filtros do catálogo

Concluído nesta atualização:

- `src/app/(shop)/produtos/page.tsx` agora aceita filtros por URL para busca, categoria e ordenação.
- `src/lib/catalog/queries.ts` centraliza o contrato público do catálogo, mantendo produto ativo, categoria ativa e variante com estoque como regra server-side.
- A página de produtos exibe total de resultados e mensagem vazia específica para filtros sem resultado.
- O E2E público cria produto/categoria reais no banco, valida busca + categoria + ordenação e limpa os dados ao final.

Validações executadas:

- `npm run validate:project` passou.
- `npx playwright test tests/e2e/public-flow.spec.ts` passou com 12 testes em Chromium desktop e mobile.
- `npm run check:operational` passou.
- `npm run build` passou.
- `npm run test:e2e` passou com 14 testes em Chromium desktop e mobile.

Próximas pendências objetivas:

- Completar dados institucionais do footer quando CNPJ/endereço oficial forem definidos.
- Testar Mercado Envios com credencial e `shipment_id` reais.

## Atualização mais recente - footer público Shopify

Concluído nesta atualização:

- Criado `src/components/shop/shop-footer.tsx`.
- O layout público agora exibe footer com barra colorida herdada do tema Shopify, links úteis, atendimento, pagamento seguro e entrega acompanhada.
- O footer usa assets já migrados, sem importar Liquid, CSS ou JavaScript do tema.
- E2E público ampliado para verificar o footer.

Validações executadas:

- `npm run validate:project` passou.
- `npx playwright test tests/e2e/public-flow.spec.ts` passou após correção do warning de imagem.
- `npm run check:operational` passou.
- `npm run build` passou.
- `npm run test:e2e` passou com 12 testes em Chromium desktop e mobile.

Próximas pendências objetivas:

- Completar dados institucionais do footer quando CNPJ/endereço oficial forem definidos.
- Testar Mercado Envios com credencial e `shipment_id` reais.

## Atualização mais recente - inventário Shopify e catálogo visual

Concluído nesta atualização:

- Criado `docs/shopify-asset-inventory.md` com decisão arquivo a arquivo para assets do tema Shopify.
- Criado `docs/shopify-liquid-react-map.md` com equivalência entre seções Liquid prioritárias e componentes/rotas Next.js.
- Criado `src/components/shop/shop-trust-strip.tsx` usando assets reais de suporte, carrinho e Nerdcoins.
- Catálogo e detalhe do produto agora mostram benefícios visuais de entrega acompanhada, carrinho seguro e Nerdcoins.
- E2E público ampliado para cobrir os benefícios visuais do catálogo.

Validações executadas:

- `npm run validate:project` passou.
- `npm run check:operational` passou.
- `npm run build` passou.
- `npm run test:e2e` passou com 12 testes em Chromium desktop e mobile.

Próximas pendências objetivas:

- Testar Mercado Envios com credencial e `shipment_id` reais.

## Atualização mais recente - admin, rastreamento manual e idempotência

Concluído nesta atualização:

- O fluxo E2E com banco real agora valida replay de webhook aprovado sem duplicar baixa de estoque, uso de cupom, lançamento de inventário ou pontos de fidelidade.
- O E2E agora cria um usuário admin real, faz login pelo painel, abre o pedido pago e confere frete/total.
- O painel do pedido agora registra rastreamento manual pela interface e exibe provider/status em PT-BR.
- Ajustada copy do admin de pedidos para acentuação correta.

Validações executadas:

- `npx playwright test tests/e2e/checkout-db-flow.spec.ts` passou.
- `npm run validate:project` passou.
- `npm run check:operational` passou.
- `npm run build` passou.
- `npm run test:e2e` passou com 12 testes em Chromium desktop e mobile.

Pendências ainda reais:

- Testar sincronização Mercado Envios com `MERCADO_ENVIOS_ACCESS_TOKEN` e `shipment_id` reais.
- Integrar cotação oficial de frete apenas quando houver credencial/fluxo oficial aplicável para loja própria.

## Atualização mais recente - fase 16 migração visual Shopify

Concluído nesta atualização:

- Iniciada a migração visual controlada do tema Shopify para o Next.js.
- Criado `docs/phase-16-shopify-visual-migration.md`.
- Criada `public/shopify/` com assets reais selecionados do tema exportado.
- Atualizados header e home para usar logo e imagem reais, sem importar Liquid.
- Mantidos os guardrails do blueprint: Shopify como referência visual/comercial e SavePointFinance como referência de robustez técnica.

## Atualização anterior - alinhamento Shopify + SavePointFinance

Concluído nesta atualização:

- Criado `docs/shopify-savepoint-migration-blueprint.md` como regra de migração entre o tema Shopify exportado, o NerdLingoLab e as práticas do SavePointFinance.
- Confirmado que o tema Shopify deve ser usado como referência visual, comercial e de conteúdo, não como código Liquid de produção.
- Confirmado que o SavePointFinance deve ser usado como referência de engenharia: organização, validações, auditorias, modelagem Prisma, webhooks persistidos, smoke tests e disciplina operacional.
- Definido que assets do Shopify só devem entrar em `public/` quando forem realmente usados, com nomes normalizados e sem scripts legados desnecessários.

Arquivos de referência obrigatória:

- `docs/shopify-savepoint-migration-blueprint.md`
- `C:\Users\User\Desktop\theme_export__nerdlingolab-com-nerdlingolav-v11-9-5__24APR2026-1138am.zip`
- `C:\Users\User\Desktop\SavePointFinance-reference`

## Atualização anterior - fase 15 sem Docker

Concluído nesta rodada:

- Criado `.env` local de desenvolvimento com valores descartáveis para permitir build e smoke tests.
- Criado `.gitignore` para não versionar `.env`, `.next`, `node_modules`, resultados Playwright e artefatos locais.
- Movido `proxy.ts` para `src/proxy.ts`, conforme convenção do Next 16 quando o projeto usa `src/app`.
- Confirmada proteção de `/admin/*` via E2E.
- Marcadas como dinâmicas as rotas que dependem de Prisma/Auth, evitando consulta ao banco durante build.
- Adicionado `/api/health/ready` para checar banco e storage quando Docker/infra estiverem ativos.
- Ajustado Mercado Pago para validar token no momento de uso, sem quebrar build por import de módulo.

Validações executadas e aprovadas:

- `npm run validate:project`
- `npm run check:operational`
- `npm run build`
- `npm run test:e2e` com 8 testes aprovados em desktop e mobile.

Bloqueio externo atual:

- Docker não está instalado ou não está disponível no PATH desta máquina. Por isso, ainda não foi possível subir Postgres/MinIO, rodar migrations reais, seed e validação completa com banco/storage.

## Pedido original

Construir um e-commerce completo para substituir Shopify, usando Next.js App Router, TypeScript strict, PostgreSQL, Prisma, Auth.js, Tailwind, Shadcn/ui, Zustand, TanStack Query, MinIO, Resend, React Email, Sentry e Mercado Pago.

O projeto deve ter rigor de sistema financeiro para pagamento, estoque, pedidos, cupons e fidelidade. A interface deve ficar em português do Brasil, com acentuação correta e sem textos técnicos como "backend", "frontend", "desenvolvimento" ou instruções para devs em cards/páginas.

## Diretriz de migração Shopify + SavePointFinance

Este projeto substitui o tema Shopify do NerdLingoLab, mas não deve migrar Liquid para produção. O Shopify é a fonte de verdade para identidade visual, estrutura comercial, assets úteis, textos em PT-BR, comunicação de confiança, ofertas, cupons, fidelidade, cashback/nerdcoins, suporte e páginas institucionais.

O SavePointFinance é a referência de robustez, não de domínio. Não copiar regras financeiras pessoais, categorias financeiras, assinaturas ou fluxos que não pertençam ao e-commerce. Reaproveitar o padrão de engenharia: separação de rotas públicas e protegidas, APIs por domínio, Prisma como contrato de dados, webhooks persistidos e idempotentes, auditorias operacionais, smoke tests, validação explícita de ambiente e admin auditável.

Toda fase nova deve responder a três perguntas antes de implementar:

- Qual comportamento do Shopify esta fase preserva ou melhora?
- Qual prática de robustez do SavePointFinance esta fase aplica?
- Qual validação comprova que checkout, pedidos, estoque, cupons, fidelidade ou webhooks não regrediram?

## Stack atual

- Next.js `16.2.4`
- React `19.2.5`
- TypeScript `6.0.3`
- Prisma `6.19.3`, fixado por compatibilidade
- PostgreSQL em Docker Compose
- MinIO em Docker Compose
- Auth.js / NextAuth beta `5.0.0-beta.31`
- Sentry `10.50.0`
- Mercado Pago SDK `2.12.0`
- Recharts `3.8.1`
- Zod `4.3.6`
- Playwright `1.59.1`

## Scripts principais

- `npm run dev`
- `npm run build`
- `npm run validate:project`
- `npm run validate:encoding`
- `npm run validate:ui-copy`
- `npm run check:operational`
- `npm run test:e2e`
- `npm run prisma:generate`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run setup`

## Arquivos de política

- `docs/encoding.md`: padrão UTF-8, NFC, sem BOM e sem mojibake.
- `docs/ui-copy-policy.md`: bloqueia termos técnicos e textos sem acentuação na interface.
- `docs/shopify-savepoint-migration-blueprint.md`: regras de migração Shopify -> NerdLingoLab usando SavePointFinance como referência de engenharia.
- `scripts/check-encoding.mjs`: valida encoding do projeto.
- `scripts/check-ui-copy.mjs`: valida textos visíveis em `.tsx`.

## Inventário base da migração

Tema Shopify exportado:

- 202 arquivos no ZIP.
- `assets`: 37 arquivos, incluindo CSS/JS customizados, logos, imagens de produto, badges de app, cashback e integrações.
- `sections`: 58 arquivos Liquid, incluindo header, footer, coleção, produto, carrinho, ofertas, newsletter, loyalty e cashback.
- `snippets`: 69 fragmentos Liquid.
- `templates`: 29 templates.
- `locales`: `pt-BR`, `en` e `es`.
- `config`: settings e markets.

Repositório SavePointFinance de referência:

- Clonado em `C:\Users\User\Desktop\SavePointFinance-reference` apenas para leitura e comparação.
- Usar como referência para estrutura, validação e operação.
- Não usar como fonte de regras de negócio do NerdLingoLab.

## Fase 1 - Fundação e infraestrutura

Entregue:

- `docker-compose.yml` com Postgres e MinIO.
- `prisma/schema.prisma` com usuários, Auth.js, produtos, categorias, variações, estoque, pedidos, itens, cupons, fidelidade, ledger, webhooks.
- `prisma/seed.ts` para criar Superadmin.
- `.env.example`.
- Configuração inicial Next, Sentry, Prisma e scripts de banco.

Observação:

- O seed exige `SUPERADMIN_EMAIL` e `SUPERADMIN_PASSWORD`.

## Fase 2 - App shell e integrações base

Entregue:

- Estrutura App Router com route groups `(shop)` e `(admin)`.
- Instâncias singleton em `src/lib`.
- Auth.js com Credentials e Google.
- Middleware/proxy administrativo.
- Layouts iniciais da vitrine e painel.

Atualização importante:

- Em Next 16, `middleware.ts` foi migrado para `src/proxy.ts`.

## Fase 3 - Catálogo inicial

Entregue:

- CRUD administrativo de produtos.
- CRUD de categorias.
- Queries públicas para vitrine.
- Páginas `/produtos` e `/produtos/[slug]`.
- Componentes de formulário, tabela e cards de produto.

Pendente:

- Variações mais completas por tamanho/cor/sku.
- Filtros avançados e busca.

## Fase 4 - Carrinho

Entregue:

- Zustand para estado do carrinho.
- Página `/carrinho`.
- Botão de adicionar ao carrinho.
- Validação server-side do carrinho em `/api/cart/validate`.

Atualização pós-React 19:

- Validação automática do carrinho foi ajustada para evitar `setState` síncrono dentro de `useEffect`.

## Fase 5 - Cupons e fidelidade no carrinho

Entregue:

- Motor de cupons com datas, limites e valores.
- Pontos de fidelidade no carrinho.
- Revalidação server-side de descontos.
- CRUD administrativo de cupons.

Regra:

- Nenhum cálculo crítico deve confiar no client.

## Fase 6 - Checkout interno e Mercado Pago

Entregue:

- Página `/checkout`.
- Endpoint `/api/checkout`.
- Criação de pedido local antes do pagamento.
- Criação de preferência Mercado Pago.
- Retorno em `/checkout/retorno`.

Ajuste feito:

- Criação de `OrderItem` corrigida para relações Prisma tipadas e snapshot JSON serializável.

Pendente:

- Checkout transparente completo com campos avançados.
- Teste com credenciais reais/sandbox Mercado Pago.

## Fase 7 - Webhook Mercado Pago e pós-pagamento

Entregue:

- Endpoint `/api/webhooks/mercadopago`.
- Processamento idempotente.
- Atualização transacional do pedido.
- Baixa de estoque.
- Registro de uso de cupom.
- Registro de pontos no ledger de fidelidade.

Pendente:

- Assinatura/validação robusta do webhook conforme ambiente Mercado Pago real.
- Testes de replay e duplicidade.

## Fase 8 - Admin de pedidos e encoding

Entregue:

- Listagem administrativa de pedidos.
- Detalhe de pedido.
- Histórico de estoque, cupom e fidelidade.
- Política robusta de encoding e texto da interface.

Regra:

- Orientações técnicas ficam em docs locais, nunca em cards/páginas da interface.

## Fase 9 - Operação de pedidos

Entregue:

- Ações administrativas para avançar pedido.
- Marcar processamento, envio, entrega e cancelamento permitido.
- Restrições para evitar transições inválidas.

Pendente:

- Reembolso real integrado ao Mercado Pago.
- Rastreamento/logística.

## Fase 10 - Upload de imagens de produto

Entregue:

- Upload administrativo para imagens de produto.
- Integração MinIO/S3-compatible.
- URLs públicas via storage.

Pendente:

- Compressão/otimização de imagem.
- Remoção segura de imagens órfãs.

## Fase 11 - Área do cliente

Entregue:

- Página `/conta`.
- Visão de pedidos do cliente.
- Detalhe de pedido do cliente.
- Pontos e histórico de fidelidade.

Pendente:

- Edição de dados pessoais.
- Endereços salvos.
- Login social testado em ambiente real.

## Fase 12 - Navegação e layouts

Entregue:

- Navegação pública.
- Shell administrativo.
- Separação correta da página de login fora do shell.
- Links do painel: Painel, Relatórios, Pedidos, Produtos, Categorias, Cupons.

Pendente:

- Estado ativo no menu.
- Melhorias finas de mobile no painel.

## Fase 13 - Métricas do painel

Entregue:

- Métricas reais no painel administrativo.
- Receita total.
- Receita do dia.
- Receita do ano.
- Pedidos pagos totais, do dia e do ano.
- Produtos ativos.
- Pontos emitidos totais e no ano.

Pedido específico atendido:

- Ano incluído para fins de relatório.

## Fase 14 - Relatórios anuais

Entregue:

- Página `/admin/relatorios`.
- Consultas em `src/lib/reports/queries.ts`.
- Gráficos anuais com Recharts.
- Receita por mês.
- Descontos por cupons e pontos.
- Pontos emitidos e resgatados por mês.

Pendente:

- Filtros por período customizado.
- Exportação CSV/PDF.
- Relatórios por produto, categoria e cliente.

## Atualização de dependências - 24/04/2026

Atualizado:

- Next, React, Sentry, Zod, Recharts, Mercado Pago, MinIO, React Hook Form, TanStack Query, Resend, React Email, Lucide, Zustand e utilitários.

Mantido por compatibilidade:

- Prisma em `6.19.3`; Prisma 7 exige migração estrutural.
- Tailwind em `3.4.19`; Tailwind 4 exige migração do pipeline CSS.
- ESLint em `9.39.4`; ESLint 10 conflita com plugins transitivos do Next.
- Next canary recusado por conflito com Sentry.
- React canary recusado por risco sem ganho imediato.

Depreciações corrigidas:

- `package.json#prisma` removido.
- Criado `prisma.config.ts`.
- `z.nativeEnum` trocado por `z.enum`.
- `disableLogger` do Sentry trocado por `webpack.treeshake.removeDebugLogging`.
- `middleware.ts` trocado por `proxy.ts` para Next 16.

## Fase 15 - Prontidão operacional

Entregue:

- `playwright.config.ts`.
- `tests/e2e/public-flow.spec.ts`.
- `scripts/check-operational-readiness.mjs`.
- `docs/phase-15-operational-readiness.md`.
- Instalação do Chromium do Playwright.
- Verificação operacional local.
- Endpoint `/api/health/ready`.
- Build sem consulta prematura ao banco.
- Smoke E2E desktop/mobile aprovado.

Resultado já observado:

- `npm run check:operational` passou.
- `npm run validate:project` passou.
- `npm run build` passou.
- `npm run test:e2e` passou com 8 testes.
- Playwright conseguiu subir a aplicação e validar `/api/health`.

Estado do E2E no momento do handoff:

- Testes de home, páginas públicas leves, proteção admin e health passaram em desktop e mobile.
- Testes com banco real ainda dependem de Docker/Postgres/MinIO.

## Fase 16 - Migração visual inicial do Shopify

Entregue:

- `docs/phase-16-shopify-visual-migration.md`.
- `public/shopify/` com assets selecionados do tema Shopify exportado.
- Logos, imagem comercial, ícones de conta/carrinho/suporte/nerdcoins e badges de app extraídos do tema.
- `src/components/shop/shop-header.tsx` usando o logo real do tema.
- `src/app/(shop)/page.tsx` com hero visual usando imagem real do tema.
- Texto técnico visível removido da home e copy com acentuação corrigida.

Guardrails aplicados:

- Shopify usado como referência visual e comercial, não como Liquid de produção.
- SavePointFinance usado apenas como referência de robustez técnica.
- Nenhuma dependência nova foi adicionada.
- Nenhum asset foi migrado em massa; apenas arquivos úteis e identificados foram copiados para `public/shopify/`.

Pendências da fase:

- Verificar visualmente home em desktop e mobile.
- Expandir o mapeamento Liquid -> React para ofertas, coleção, produto, carrinho e fidelidade.
- Cobrir home/produtos/fidelidade com E2E ou smoke test visual.

## Validações conhecidas

- Após a fase 16, `npm run validate:project` passou.
- Após a fase 16, `npm run build` passou.
- Após a fase 16, `npm run test:e2e` passou com 8 testes em desktop e mobile.
- Docker continua indisponível no PATH, então validação real com Postgres e MinIO permanece bloqueada pelo ambiente.

## Atualização de auditoria - erros, UI e segurança

Concluído nesta rodada:

- Criado sistema de fallback amigável com `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`, `src/app/loading.tsx` e `src/components/feedback/empty-state.tsx`.
- Criado parser de respostas amigáveis em `src/lib/http/friendly-response.ts` para impedir que clientes mostrem JSON cru ou mensagens técnicas.
- Adicionado rate limit para carrinho, checkout, upload, webhook Mercado Pago e login administrativo.
- Adicionada validação de origem para rotas internas mutáveis.
- Adicionada validação de assinatura do webhook Mercado Pago em `src/lib/security/mercadopago-signature.ts`.
- Adicionada validação de bytes reais para upload de imagem, além de MIME e tamanho.
- Corrigidas imagens de produto/carrinho para usar `next/image` com texto alternativo.
- Corrigidos rótulos visíveis em login, checkout, produto, categorias, cupons e upload de imagens.
- Corrigido botão de tema para evitar falha de hidratação.
- Ajustado tema claro/escuro com contraste validado por script.
- Adicionados `scripts/check-contrast.mjs` e `scripts/audit-routes.mjs`.

Validações executadas após a auditoria:

- `npm run validate:project` passou.
- `npm run build` passou.
- `npm run test:e2e` passou com 8/8 testes em desktop e mobile.

Passaram:

- `npm run validate:project`
- `npm run check:operational`
- `npx prisma generate`
- `npm run lint`
- `npm run typecheck`
- `node scripts/check-encoding.mjs`
- `node scripts/check-ui-copy.mjs`

Reexecutar no próximo chat:

- `npm run validate:project`
- `npm run check:operational`
- `npm run test:e2e`
- `npm run build`

## Atualização mais recente - validação Docker e smoke visual

Concluído nesta atualização:

- Docker Desktop estava disponível; Postgres e MinIO foram iniciados com `docker compose up -d`.
- Criada e aplicada a migration inicial Prisma em `prisma/migrations/20260424220959_init/migration.sql`.
- Seed executado com sucesso.
- Bucket MinIO `product-images` criado.
- `/api/health/ready` retornou 200 com `database` e `storage` saudáveis.
- Playwright Chromium instalado localmente com `npx playwright install chromium`.
- Adicionado `dev:webpack` ao `package.json` e o Playwright passou a usar esse script para evitar panic do Turbopack em junctions no Windows.
- E2E público expandido para cobrir home visual, produtos, fidelidade, rotas públicas e admin redirect em desktop e mobile.
- Copy visível ajustada em carrinho e fidelidade para PT-BR com acentuação e sem termos técnicos.

Validações executadas:

- `npm run validate:project` passou.
- `npm run check:operational` passou.
- `npm run build` passou.
- `npm run test:e2e` passou com 10/10 testes.

Observações:

- `npm run setup` pode travar em ambiente novo porque `prisma migrate dev` fica interativo quando ainda não existe migration. Nesta rodada foi usado `npx prisma migrate dev --name init`.
- Evitar rodar `check:operational` enquanto `next dev` está ativo no Windows, pois `prisma generate` pode falhar ao renomear o DLL do query engine.
- O E2E usa `dev:webpack`; o build de produção continua passando com Turbopack.
- Os avisos antigos de Sentry sobre `onRequestError` e `sentry.client.config.ts` foram corrigidos na atualização seguinte.

## Atualização mais recente - fluxo com banco real e substituição do remoto

Concluído nesta atualização:

- Criado `tests/e2e/checkout-db-flow.spec.ts` cobrindo produto -> carrinho -> cupom -> checkout -> pedido -> aprovação de pagamento -> estoque -> cupom -> fidelidade -> webhook em Postgres real.
- Adicionado modo local explícito `CHECKOUT_PAYMENT_MOCK=true` apenas para E2E sem credenciais sandbox Mercado Pago. Produção continua exigindo token real.
- Corrigido checkout para manter a confirmação do pedido visível após limpar o carrinho.
- Corrigidas mensagens de cupom e carrinho com acentuação correta.
- Extraída função `processApprovedMercadoPagoPayment` para testar o processamento aprovado sem depender da API externa.
- Prisma deixou de logar queries por padrão; logs detalhados agora exigem `DEBUG_PRISMA_QUERIES=true`.
- Corrigida configuração Sentry: `src/instrumentation.ts` exporta `onRequestError`, e o client foi migrado para `src/instrumentation-client.ts` com `onRouterTransitionStart`.
- Removidos do estado atual os diretórios brutos do tema Shopify herdados do remoto antigo: `assets/`, `config/`, `layout/`, `locales/`, `sections/`, `snippets/`, `templates/`.
- Decisão do usuário: substituir completamente o repositório GitHub pelo projeto local atual; o remoto anterior estava desatualizado.

Validações executadas:

- `npm run validate:project` passou.
- `npm run check:operational` passou.
- `npm run build` passou.
- `npm run test:e2e` passou com 12/12 testes.

Observação:

- O mock de pagamento não mascara produção; ele é uma chave explícita para E2E local sem sandbox Mercado Pago. O fluxo financeiro interno testado usa banco real, transação Prisma, baixa de estoque, cupom, fidelidade e webhook.

## Atualização mais recente - frete, rastreamento e Mercado Envios

Concluído nesta atualização:

- Criada migration `20260424230300_shipping_quotes_and_tracking`.
- Adicionados campos de frete no pedido: opção, serviço, provedor, CEP, prazo estimado e valor.
- Adicionados modelos `Shipment` e `ShipmentEvent` para rastreamento e histórico de entrega.
- Criado endpoint `POST /api/shipping/quote` para cotação server-side por CEP.
- Produto agora mostra cálculo de frete.
- Carrinho agora permite calcular e escolher entrega; o valor entra no total.
- Checkout revalida a opção de entrega no servidor e grava `shippingCents` no pedido.
- Admin do pedido mostra entrega/rastreamento, permite registro manual e sincronização com Mercado Envios por `shipment_id`.
- Criado cliente Mercado Envios para consultar `/shipments/{id}`, `/shipments/{id}/history` e `/shipments/{id}/carrier` quando `MERCADO_ENVIOS_ACCESS_TOKEN` estiver configurado.
- O E2E com banco real foi atualizado para validar frete dentro do total do pedido.

Decisão técnica:

- Mercado Envios foi tratado como provedor de rastreamento/sincronização por `shipment_id`, conforme API pública do Mercado Livre. A cotação da loja própria permanece server-side local até existir fluxo/credencial habilitado para cotação oficial de envio fora do marketplace.

Validações executadas:

- `npm run validate:project` passou.
- `npm run check:operational` passou.
- `npm run build` passou.
- `npm run test:e2e` passou com 12/12 testes.

## Estado importante do runtime

Para E2E completo:

1. Criar `.env` a partir de `.env.example`.
2. Preencher pelo menos:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `SUPERADMIN_EMAIL`
   - `SUPERADMIN_PASSWORD`
   - credenciais MinIO.
3. Subir Postgres e MinIO.
4. Rodar migrations e seed.
5. Rodar E2E.

Comandos sugeridos:

```bash
docker compose up -d
npx prisma migrate dev --name init
npm run db:seed
npm run validate:project
npm run check:operational
npm run build
npm run test:e2e
```

## O que ainda falta fazer

Prioridade alta:

- Integrar cotação oficial de frete quando a conta Mercado Envios/Mercado Livre expuser endpoint aplicável para loja própria.
- Testar sincronização Mercado Envios com `MERCADO_ENVIOS_ACCESS_TOKEN` e `shipment_id` reais.
- Expandir auditorias operacionais inspiradas no SavePointFinance para checkout, pedidos, estoque, cupons, fidelidade e Mercado Pago.

Prioridade alta para produção:

- Mercado Pago sandbox/produção com webhooks reais.
- Reembolso/cancelamento integrado ao Mercado Pago.
- Backups do Postgres e MinIO.
- Healthcheck com banco e storage, além de `/api/health`.
- Variáveis reais de Sentry e Resend.
- Logs e alertas.

Prioridade média:

- E-mails transacionais com React Email e Resend.
- PDF de pedido/fatura com `@react-pdf/renderer`.
- Exportação de relatórios.
- Filtros avançados em pedidos e relatórios.
- Busca e filtros do catálogo.
- Variações de produto mais completas.
- Endereços salvos na conta do cliente.
- Otimização de imagens.
- Normalização final de assets migrados do Shopify.
- Revisão de textos comerciais herdados do Shopify conforme `docs/ui-copy-policy.md`.

Migrações planejadas:

- Prisma 7 em fase própria.
- Tailwind 4 em fase própria.
- ESLint 10 apenas quando plugins do ecossistema estiverem compatíveis.
- Avaliar Next canary apenas quando Sentry aceitar peer dependency.

## Regras que o próximo chat deve manter

- Atualizar `docs/phases-consolidated-handoff.md` sempre que concluir uma etapa ou descobrir uma pendência relevante.
- Ler `docs/shopify-savepoint-migration-blueprint.md` antes de migrar visual, conteúdo, assets ou padrões operacionais.
- Usar o Shopify como referência visual/comercial e o SavePointFinance como referência de robustez técnica.
- Não importar Liquid como código de produção.
- Não copiar regras de negócio financeiras do SavePointFinance.
- Não migrar todos os assets do Shopify de uma vez; mover somente assets usados para `public/`.
- Não adicionar dependências novas sem necessidade real.
- Não colocar termos técnicos ou instruções de desenvolvimento na interface.
- Interface sempre em PT-BR com acentuação correta.
- Todo cálculo de cupom, pontos, frete, estoque e pagamento deve ser revalidado no servidor.
- Não confiar no client para valores financeiros.
- Usar Prisma `$transaction` em mutações críticas.
- Webhooks devem ser idempotentes.
- Webhooks críticos devem persistir evento, status e resultado antes de alterar estado financeiro, estoque ou fidelidade.
- Componentes devem ser pequenos e focados.
- Documentação técnica deve ir para `docs/`.
- Preservar comportamento de checkout, pedidos, estoque e fidelidade com teste ou smoke test antes de refatorar.
- Rodar `npm run validate:project`, `npm run check:operational`, `npm run build` e `npm run test:e2e` antes de considerar pronto quando a mudança tocar fluxo de loja.

## Prompt recomendado para um chat novo

Continue o projeto em `C:\Users\User\Desktop\NerdLingoLab` lendo primeiro `docs/phases-consolidated-handoff.md` e `docs/shopify-savepoint-migration-blueprint.md`. Não assuma contexto anterior. Siga as regras do projeto: Shopify como referência visual/comercial, SavePointFinance como referência de robustez técnica, interface em PT-BR com acentuação correta, sem termos técnicos visíveis na UI, validação server-side para dinheiro/estoque/fidelidade, e documentação técnica apenas em `docs/`.

Primeira tarefa: avançar o fluxo completo com banco real. Com Docker ativo, rode `npm run validate:project`, `npm run check:operational`, `npm run build` e `npm run test:e2e`; depois implemente ou teste o caminho produto -> carrinho -> checkout -> pedido -> webhook aprovado -> estoque -> pontos -> painel. Em paralelo, inventarie assets Shopify úteis e expanda o mapeamento Liquid -> React para ofertas, coleção, produto, carrinho e fidelidade.
