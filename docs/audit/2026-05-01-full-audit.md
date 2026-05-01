# Auditoria completa - NerdLingoLab

Data: 2026-05-01
Escopo: codigo local em `C:\Users\samue\Desktop\NerdLingoLab` e producao via SSH em `/home/ubuntu/Nerdlingolab`.

## Resumo executivo

O sistema esta online em producao e o build atual compila. As validacoes principais de TypeScript, ESLint, build, rotas, imagens e actions passaram. Os riscos mais importantes estao em seguranca de login/rate limit, contratos de e-commerce quebrados, pipeline E2E mobile instavel, catalogo paginando em memoria, Mercado Pago sem variaveis em producao e popup NerdCoins ausente no banco.

## Atualizacao pos-correcao

Correcoes aplicadas nesta rodada:

- Login de credenciais recebeu rate limit por e-mail.
- Validacao de origem passou a falhar fechada quando nao ha origem/referer/host confiavel.
- Webhook Mercado Pago nao aceita chamadas sem assinatura por padrao.
- Catalogo `/produtos` passou a usar paginacao server-side com `pagina`, `take`, `skip` e `count`.
- Paginas publicas e privadas receberam metadados/canonical/noindex conforme o caso.
- Popup NerdCoins e cupom `BEMVINDO10` foram adicionados ao seed.
- Admin deixou de disparar notificacoes de rastreio atrasado durante renderizacao de layout.
- Contratos de variante preservam tamanho ao trocar cor e mantem orientacao de imagem por Cor + Sexo.
- Textos de interface com acentuacao incorreta foram corrigidos.
- `npm run validate:project` e `npm run build` passaram apos as correcoes.

Pendencias externas:

- Configurar em producao `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY`, `MERCADO_PAGO_WEBHOOK_SECRET` e `MERCADO_ENVIOS_ACCESS_TOKEN`.
- Revisar e estabilizar a suite E2E mobile, que depende de ambiente de testes e dados controlados.

## Evidencias de saude

- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm audit --omit=dev --audit-level=moderate`: 0 vulnerabilidades.
- `npm run build`: passou com Next.js 16.2.4.
- `npm run validate:contrast`: passou.
- `npm run audit:images`: passou, 2057 URLs verificadas.
- `npm run audit:routes`: passou.
- `npm run audit:actions`: passou.
- Producao: `GET /api/health` e `GET /api/health/ready` retornaram `ok: true`.
- Docker em producao: `nerdlingolab-app`, `nerdlingolab-postgres` e `nerdlingolab-minio` saudaveis.

## Achados criticos e altos

### P1 - Login sem protecao forte contra brute force

Arquivo: `src/lib/auth.ts`

O fluxo de Credentials faz busca de usuario e `bcrypt.compare` sem lockout por conta, throttling persistente ou politica especifica para admin. Isso deixa login de admin e cliente vulneravel a brute force e credential stuffing.

Recomendacao: rate limit distribuido por IP e email, lockout progressivo, log de falhas e MFA opcional/obrigatorio para admin.

### P1 - E2E mobile publico falha

Arquivo: `tests/e2e/public-flow.spec.ts`

O agente de UX/desempenho encontrou falha em 10 de 12 testes mobile. Ha assertions antigas, limpeza de produto presa por FK e dependencia de storage/MinIO no readiness.

Recomendacao: atualizar os testes para a UI atual, limpar dados em ordem transacional e mockar/configurar MinIO no ambiente E2E.

### P1 - Catalogo busca tudo e pagina em memoria

Arquivos:
- `src/lib/catalog/queries.ts`
- `src/app/(shop)/produtos/page.tsx`

`getPublicProducts` faz `findMany` sem `take/skip` e a pagina usa `products.slice(0, filters.perPage)`. O controle envia `pagina`, mas a pagina nao le esse parametro. Com 94 produtos e 2328 variantes em producao ainda funciona, mas vai degradar rapidamente.

Recomendacao: implementar paginacao server-side com `take`, `skip`, `count`, leitura de `pagina` e UI de paginas/carregar mais.

### P1 - Mercado Pago ausente em producao

Producao:
- `MERCADO_PAGO_ACCESS_TOKEN`: ausente.
- `MERCADO_PAGO_PUBLIC_KEY`: ausente.
- `MERCADO_PAGO_WEBHOOK_SECRET`: ausente.
- `MERCADO_ENVIOS_ACCESS_TOKEN`: ausente.

O checkout real por Mercado Pago tende a falhar ou ficar incompleto.

Recomendacao: configurar variaveis reais e rodar teste de checkout em producao controlada.

### P1 - Popup NerdCoins nao existe em producao

Banco de producao:
- `MarketingPopup: 0`
- `ActiveMarketingPopup: 0`

Isso explica o popup de apresentacao do NerdCoins nao aparecer para usuarios deslogados.

Recomendacao: criar seed/migracao ou tela admin que grave o popup ativo para audiencia deslogada.

## Achados medios

### P2 - Validacao CSRF/origin falha aberta

Arquivo: `src/lib/security/request.ts`

O helper de origem aceita requisicoes sem `Origin` ou `Host`. Para rotas mutaveis, isso deveria falhar fechado ou validar contra URL canonica.

Recomendacao: exigir origem confiavel para POST/PATCH/DELETE e usar `Referer` apenas como fallback.

### P2 - Rate limit em memoria e spoofavel

Arquivo: `src/lib/security/rate-limit.ts`

O rate limit usa `Map` em memoria e confia em headers como `x-forwarded-for`. Em ambiente com proxy ou multiplas instancias, pode ser burlado.

Recomendacao: usar Redis/Postgres para store e IP confiavel vindo do proxy.

### P2 - Rotina de atraso roda no render do admin

Arquivo: `src/app/(admin)/admin/(panel)/layout.tsx`

O layout do admin chama `notifyOverdueShipments()` em todo render. Essa rotina consulta, atualiza shipments e pode enviar e-mails.

Recomendacao: mover para cron/job idempotente ou acao explicita com cache.

### P2 - Imagens remotas podem ignorar otimizacao do Next

Arquivos:
- `src/components/media/safe-image.tsx`
- `src/lib/images.ts`

O componente aplica `unoptimized` para URLs HTTP/remotas. Isso prejudica LCP e consumo de banda.

Recomendacao: otimizar hosts permitidos via `remotePatterns` e usar bypass apenas para fontes incompatíveis.

### P2 - Slideshow sem pausa/reduced motion

Arquivo: `src/components/shop/auto-carousel.tsx`

O carousel usa `setInterval`, mas nao respeita `prefers-reduced-motion` e nao pausa em hover/focus.

Recomendacao: adicionar pausa, controle play/pause e suporte a motion reduzido.

### P2 - Contratos de UI/e-commerce falhando

Scripts:
- `npm run validate:ui-copy`
- `npm run audit:ecommerce`
- `npm run check:operational`

Falhas citadas:
- `src/features/theme/components/theme-image-field.tsx`: mensagem de falha de upload.
- `src/features/catalog/components/product-purchase-panel.tsx`: cor deve preservar tamanho quando possivel.
- `src/features/catalog/components/product-form.tsx`: admin deve orientar imagem por cor e sexo.
- Varias strings de UI com acentuacao/copy fora do contrato.

Recomendacao: corrigir copy/contratos ou atualizar os scripts se o vocabulario atual for o correto.

## Achados operacionais de producao

- Producao possui `?? backups/` nao versionado no diretorio do servidor. Nao foi alterado.
- `docker compose` sem `sudo` falha por `.env` root-owned; operacao normal exige `sudo`.
- Admin em producao ainda tem `cpf` ou `termsAcceptedAt` ausentes no dado (`AdminsWithoutCpfOrTerms: 1`). O codigo atual ja deve ignorar essa exigencia para admin, mas o dado confirma a causa original do bug.
- Melhor Envio principal esta configurado: `MELHOR_ENVIO_ACCESS_TOKEN` e `MELHOR_ENVIO_FROM_POSTAL_CODE` presentes.
- `MELHOR_ENVIO_SERVICE_IDS` esta ausente; o sistema pode usar defaults, mas perde controle fino dos servicos permitidos.
- Banco de producao: 94 produtos, 2328 variantes, 0 pedidos, 0 shipments, 8 templates de notificacao, 2 fretes manuais, 4 presets logisticos.

## Prioridade sugerida de correcao

1. Configurar Mercado Pago em producao e testar checkout real.
2. Criar/ativar popup NerdCoins em producao.
3. Implementar protecao de login contra brute force.
4. Corrigir paginacao server-side do catalogo.
5. Corrigir E2E mobile e contratos `validate:ui-copy`, `audit:ecommerce`, `check:operational`.
6. Mover notificacao de atraso do render do admin para job.
7. Melhorar otimizacao de imagens remotas e carousel.

## Fontes indexadas no context-mode

- `Validation project scripts focused summary`
- `Next build concise current`
- `Operational readiness local summary`
- `production db corrected counts admins variants shipping rates notification templates popups`
- `production correct env presence melhor envio mercado pago auth resend sentry`
- `api route security auth validation prisma external admin missing`
- `local code risk scan dangerouslySetInnerHTML eval localStorage env csrf admin`
- `client components img next image useEffect performance mobile compatibility`
- `catalog query full public products best selling new products order by pagination`

## Complemento da auditoria - dados, melhorias e agrupamento de correcoes

### Dados de producao de variantes

Consultas adicionais no banco de producao indicam que os dados importados estao saudaveis em alguns pontos, mas ainda inconsistentes para camisetas:

- `ProductsWithoutActiveVariants: 0`
- `ProductsWithOnlyOneColor: 24`
- `ProductsWithOnlyOneSize: 15`
- `ProductsWithOnlyOneGender: 80`
- Todas as variantes ativas possuem dimensoes e prazo logistico: `VariantsMissingDimensions: 0`, `VariantsMissingLeadTime: 0`.
- Todas as 2328 variantes estao com `shippingLeadTimeDays = 10`.

Produtos suspeitos:

- `Camiseta Frase Engracada Fofoca Eu Aceito`: 8 variantes, 3 cores e somente tamanho `p`. Este e o caso mais claro de importacao incompleta.
- `Camiseta - Unissex So Vim Pela Cerveja`: 14 variantes, tamanhos variados e somente cor `preto`.
- `Camiseta Cerveja`: 11 variantes, tamanhos variados e somente cor `preto`.
- `Camiseta Paciencia E Tudo`: 11 variantes, tamanhos variados e somente cor `preto`.
- `Kit 2 Camiseta Casal B.O`: 147 variantes, mas usa chaves fora do padrao `Tamanho Masculino` e `Tamanho Feminino`.

Chaves de variantes fora do padrao encontradas:

- `Tamanho Masculino`
- `Tamanho Feminino`
- `Modelos`
- `Modelo`
- `Variacoes`
- `Tamanhos`

Sugestao: criar script de normalizacao de variantes para mapear todas essas chaves para o modelo canonico `Genero`, `Cor`, `Tamanho` e preservar campos extras apenas como metadados secundarios. Para produtos de action figure, ocultar seletor de genero/cor/tamanho quando os campos forem nulos ou irrelevantes.

### Melhorias sugeridas por area

#### Seguranca

1. Adicionar rate limit persistente no login.
2. Criar lockout progressivo por e-mail em tentativas falhas.
3. Endurecer `assertSameOriginRequest` para falhar fechado em POST/PATCH/DELETE.
4. Usar store compartilhado para rate limit, preferencialmente Redis ou Postgres.
5. Exigir segredo do webhook Mercado Pago sempre que integracao de pagamento estiver ativa.

#### Catalogo e busca

1. Mudar `/produtos` para paginacao server-side real.
2. Ler e aplicar `pagina` nos filtros.
3. Retornar `total`, `totalPages`, `currentPage`.
4. Ajustar ordenacao de novidades e mais vendidos para nao depender de lista inteira em memoria.
5. Normalizar variantes importadas antes de renderizar filtros de produto.

#### Checkout, frete e producao

1. Configurar `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY`, `MERCADO_PAGO_WEBHOOK_SECRET` e `MERCADO_ENVIOS_ACCESS_TOKEN`.
2. Configurar `MELHOR_ENVIO_SERVICE_IDS` para restringir e priorizar servicos.
3. Recalcular cotacao de frete a partir de `variantId` no servidor em vez de aceitar peso/preco/dimensoes do cliente.
4. Mover notificacao de atraso de entrega para job/cron idempotente.

#### Admin e operacao

1. Criar popup NerdCoins ativo em producao.
2. Corrigir contratos `validate:ui-copy`, `audit:ecommerce` e `check:operational`.
3. Criar tela/acao admin para rodar manutencoes com feedback, em vez de rotinas no render do layout.
4. Resolver falhas de E2E mobile e estabilizar fixtures.

#### Desempenho e UX

1. Remover `unoptimized` de imagens remotas permitidas.
2. Configurar `remotePatterns` de forma mais restrita e completa.
3. Adicionar pausa e `prefers-reduced-motion` no carousel.
4. Melhorar LCP em cards de produto e imagens principais.
5. Garantir que a busca instantanea tenha limite, debounce e navegacao acessivel por teclado.

### Agrupamento de erros e arquivos para correcao

#### Grupo A - Seguranca critica

- `src/lib/auth.ts`
  - Falta rate limit/lockout no login.
  - Sugestao: proteger `CredentialsProvider.authorize`.
- `src/lib/security/request.ts`
  - Checagem de origem falha aberta quando headers faltam.
- `src/lib/security/rate-limit.ts`
  - Rate limit em memoria e dependente de headers spoofaveis.
- `src/lib/security/mercadopago-signature.ts`
  - Webhook pode aceitar falta de segredo fora de production.

#### Grupo B - Producao/configuracao

- Ambiente do servidor `/home/ubuntu/Nerdlingolab/.env`
  - Ausentes: `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY`, `MERCADO_PAGO_WEBHOOK_SECRET`, `MERCADO_ENVIOS_ACCESS_TOKEN`.
  - Ausente opcional/recomendado: `MELHOR_ENVIO_SERVICE_IDS`.
- Banco de producao `MarketingPopup`
  - Nenhum popup cadastrado. Impacta popup NerdCoins.

#### Grupo C - Catalogo, paginacao e ordenacao

- `src/lib/catalog/queries.ts`
  - `getPublicProducts` usa `findMany` sem `take/skip`.
  - Mais vendidos busca produtos e ranking de forma cara para crescimento futuro.
- `src/app/(shop)/produtos/page.tsx`
  - Usa `slice` em memoria.
  - Nao aplica `pagina`.
- `src/features/catalog/components/product-catalog-controls.tsx`
  - Envia `pagina`, mas a pagina ainda nao consome.

#### Grupo D - Variantes e importacao CSV

- `scripts/import-shopify-products.mjs`
  - Deve normalizar chaves alternativas para `Genero`, `Cor`, `Tamanho`.
- `src/features/catalog/components/product-purchase-panel.tsx`
  - Contrato falha: cor deve preservar tamanho quando possivel.
- `src/features/catalog/components/product-form.tsx`
  - Contrato falha: admin deve orientar imagem por cor e sexo.
- Dados de producao em `ProductVariant.optionValues`
  - Chaves fora do padrao: `Tamanho Masculino`, `Tamanho Feminino`, `Modelos`, `Modelo`, `Variacoes`, `Tamanhos`.

#### Grupo E - Frete e rastreio

- `src/app/api/shipping/quote/route.ts`
  - Aceita peso, dimensoes e subtotal enviados pelo cliente.
- `src/lib/shipping/quotes.ts`
  - Deve garantir estrategia clara para frete gratis com duas opcoes.
- `src/app/(admin)/admin/(panel)/layout.tsx`
  - Chama `notifyOverdueShipments()` em todo render.
- `src/lib/shipping/overdue.ts`
  - Deve virar job/cron ou acao idempotente controlada.

#### Grupo F - UX, desempenho e acessibilidade

- `src/components/media/safe-image.tsx`
  - Imagens remotas podem ficar `unoptimized`.
- `src/lib/images.ts`
  - Regras de imagem remota precisam ser mais seletivas.
- `src/components/shop/auto-carousel.tsx`
  - Falta pausa, play/pause e `prefers-reduced-motion`.
- `tests/e2e/public-flow.spec.ts`
  - E2E mobile desatualizado/instavel.

#### Grupo G - Contratos e readiness

- `src/features/theme/components/theme-image-field.tsx`
  - Falha em mensagem de upload e copy.
- `scripts/check-ui-copy.mjs`
  - Falha por varios textos/copy.
- `scripts/audit-ecommerce-contracts.mjs`
  - Falha em contratos de compra, imagem por variante e upload.
- `scripts/check-operational-readiness.mjs`
  - Aponta lacunas em Dockerfile/runtime/bootstrap e contratos criticos.

## Complemento 2 - rotas, bundle, cupons, templates e infraestrutura

### Rotas e protecao

Uma matriz precisa das rotas `src/app/**/route.ts` nao encontrou:

- APIs admin sem `isAdminSession`/guarda equivalente.
- POST/PATCH/DELETE comuns sem `assertSameOriginRequest`, exceto webhook e NextAuth, onde isso e esperado.
- Rotas publicas mutaveis sem sessao, exceto `shipping/quote`, que e publica por natureza e tem rate limit.

Ponto positivo: a superficie de API esta razoavelmente bem guardada em termos de autorizacao basica.

Ponto de melhoria: mesmo com rotas protegidas, o helper de origem e o rate limit ainda precisam endurecimento, conforme os grupos de seguranca.

### Bundle e assets

Resumo local de `.next/static` apos build:

- 36 arquivos estaticos.
- Total aproximado: 1.94 MB.
- JavaScript: 1.86 MB.
- CSS: 77.5 KB.
- Maiores chunks:
  - `.next/static/chunks/17g3ovheypnxo.js`: 419 KB.
  - `.next/static/chunks/01t6ykxwykz5~.js`: 359 KB.
  - `.next/static/chunks/0.mqo4n_1bb~a.js`: 284 KB.

Sugestao: usar analyzer de bundle para identificar se libs de admin, PDF, Mercado Pago, editor ou upload estao entrando em telas publicas. Separar dependencias pesadas por dynamic import onde fizer sentido.

### Cupons e promessa de boas-vindas

Banco de producao:

- `Coupons: []`
- `WelcomeCouponExists: 0`
- `ActiveTenReaisCoupon: 0`
- `CouponsPublic: 0`

Impacto: a experiencia prometida ao usuario deslogado, "registre-se e ganhe R$ 10", ainda nao possui cupom real no banco de producao. Mesmo que o popup seja criado, o fluxo pode prometer algo que nao sera aplicado.

Recomendacao:

1. Criar cupom ativo de R$ 10, por exemplo `BEMVINDO10`.
2. Definir regra de uso: primeira compra, um uso por cliente, minimo opcional.
3. Vincular o template `welcome_coupon` ao cupom real.
4. Exibir no popup apenas se cupom ativo existir.

Arquivos/tabelas envolvidos:

- Tabela `Coupon`
- Tabela `NotificationTemplate`
- Tabela `MarketingPopup`
- `src/lib/marketing/popups.ts`
- Seed Prisma
- Admin de cupons/engajamento

### Templates de notificacao

Banco de producao possui 8 templates ativos:

- `abandoned_cart`
- `discount_alert`
- `order_created`
- `order_paid`
- `password_reset`
- `shipment_overdue`
- `support_reply`
- `welcome_coupon`

Todos possuem assunto, corpo e variaveis `{{...}}`, mas os corpos sao curtos: entre 81 e 140 caracteres. Isso e funcional, porem simples demais para uma loja com identidade visual.

Sugestao: evoluir os templates para HTML responsivo com:

- cabecalho NerdLingoLab;
- CTA destacado;
- bloco de resumo do pedido/cupom/rastreio;
- rodape com suporte e politicas;
- versao texto simples;
- preview text especifico.

### Newsletter e midias

Producao:

- `NewsletterSubscriber: 1`
- `MediaAssets: 448`
- `DeletedMediaAssets: 0`
- `LargeMediaUnknown: 0`

Ponto positivo: nao ha midias acima de 5 MB ou sem tamanho registrado pela consulta.

Sugestao: criar rotina periodica para:

- detectar midias nao usadas;
- converter imagens antigas para WebP/AVIF;
- revisar `altText`;
- limpar assets deletados fisicamente no storage.

### Docker e runtime

O Dockerfile atual indica multi-stage, usuario `node` no runner e `CMD ["node", "server.js"]`, o que e bom para runtime. O `docker-compose` possui servicos de Postgres, MinIO, app e bootstrap.

Ponto de atencao: `db:bootstrap` executa `prisma migrate deploy`, seed e importacao Shopify. Isso e util para setup, mas perigoso se rodado sem querer em producao.

Sugestao:

- separar claramente `bootstrap` de producao;
- proteger importacao Shopify por flag explicita;
- documentar comandos seguros de deploy;
- criar script de backup antes de migrations/importacoes.

### Novos agrupamentos de correcao

#### Grupo H - Cupom de boas-vindas e promessa comercial

- Tabela `Coupon`
  - Nenhum cupom em producao.
- Tabela `MarketingPopup`
  - Nenhum popup em producao.
- `src/lib/marketing/popups.ts`
  - Deve condicionar popup/cupom a dados ativos.
- Seed/admin de engajamento
  - Criar popup NerdCoins e cupom `BEMVINDO10`.

#### Grupo I - Templates transacionais

- Tabela `NotificationTemplate`
  - Templates existem, mas corpo e muito simples.
- Bibliotecas de envio em `src/lib/email` ou `src/lib/support/send-support-email.ts`
  - Padronizar layout HTML.
- Admin/engajamento
  - Permitir preview e teste de envio.

#### Grupo J - Bundle e carregamento

- `.next/static/chunks/*`
  - Auditar chunks acima de 250 KB.
- Componentes admin e PDF
  - Verificar se codigo pesado fica restrito ao admin.
- Componentes de checkout/upload
  - Avaliar dynamic import.

## Complemento 3 - actions, SEO, acessibilidade e servidor

### Server actions

Foram encontrados 14 arquivos em `src/actions`. Nenhuma action mutavel apareceu sem guarda de autenticacao/admin na varredura estatica.

Pontos positivos:

- Actions de cliente como `account-addresses.ts` e `account-profile.ts` possuem guarda de usuario e validacao.
- Actions admin de catalogo, cupons, engajamento, pedidos, frete, midia, suporte e fidelidade possuem guarda admin.
- `scripts/audit-server-actions.mjs` passou.

Pontos de melhoria:

- `src/actions/auth.ts` aparece como action mutavel sem `authGuard`, o que e esperado para login, registro e reset de senha, mas reforca a necessidade de rate limit/lockout especifico.
- `src/actions/storefront-theme.ts` nao marcou uso de Zod na varredura, entao vale revisar validacao de payload do tema.

### SEO e metadados

Varredura de `src/app`:

- Total de pages/layouts avaliados: 46.
- Paginas publicas sem metadata/generateMetadata: 22.
- Paginas admin sem metadata/generateMetadata: 20.
- Paginas com imagem sem `alt`: 0 pela varredura estatica.

Paginas publicas importantes sem metadata propria:

- `src/app/(shop)/page.tsx`
- `src/app/(shop)/produtos/page.tsx`
- `src/app/(shop)/produtos/[slug]/page.tsx`
- `src/app/(shop)/ofertas/page.tsx`
- `src/app/(shop)/cupons/page.tsx`
- `src/app/(shop)/programa-de-fidelidade/page.tsx`
- `src/app/(shop)/suporte/page.tsx`
- `src/app/(shop)/termos/page.tsx`
- `src/app/(shop)/privacidade/page.tsx`

Recomendacao:

1. Criar metadata default no layout publico.
2. Criar `generateMetadata` dinamico para produto.
3. Adicionar canonical URLs.
4. Marcar paginas de conta, checkout, carrinho, login e reset como `noindex`.
5. Criar/validar `robots.txt` e sitemap.

### Acessibilidade estatica

Possiveis problemas de inputs sem label suficiente:

- `src/app/(admin)/admin/(panel)/clientes/page.tsx`
- `src/app/(admin)/admin/(panel)/engajamento/page.tsx`
- `src/app/(admin)/admin/(panel)/suporte/page.tsx`
- `src/app/(shop)/cadastro/google/page.tsx`
- `src/app/(shop)/cadastro/page.tsx`
- `src/app/(shop)/produtos/page.tsx`
- `src/app/(shop)/redefinir-senha/page.tsx`
- `src/features/catalog/components/product-image-uploader.tsx`
- `src/features/media/components/media-upload-button.tsx`
- `src/features/newsletter/components/newsletter-form.tsx`
- `src/features/theme/components/theme-image-field.tsx`

Recomendacao: garantir `label htmlFor`, `aria-label` ou `aria-labelledby` em todos os inputs, inclusive campos escondidos/upload quando acionados por botao customizado.

### Servidor e operacao

Saude do servidor:

- Uptime: 20 dias.
- RAM total: 23.4 GiB; disponivel: ~20.7 GiB.
- Disco `/`: 96 GB total, 35 GB usado, 62 GB livre, 36% de uso.
- App `nerdlingolab-app`: ~190 MB RAM, CPU praticamente 0%.
- Postgres `nerdlingolab-postgres`: ~38 MB RAM.
- MinIO `nerdlingolab-minio`: ~140 MB RAM.
- Logs recentes do app nao trouxeram erros relevantes na busca por `error|warn|exception|failed|timeout|500`.

Pontos de atencao:

- Servidor tambem roda outros stacks (`savepoint`, `n8n`, `nginx-proxy-manager`). Recursos estao folgados, mas isolamento e backup precisam estar documentados.
- Existem imagens Docker antigas/pesadas: `nerdlingolab-commerce-setup` 1.66 GB, `nerdlingolab-payment-audit-builder` 1.83 GB e outras imagens de auditoria. Podem ser limpas depois de confirmar que nao sao mais usadas.
- Pasta `backups/` tem apenas ~2 MB e dois dumps antigos de 2026-04-29. Nao ha evidencia de rotina automatica de backup do banco atual.
- `ingolab.duckdns.org` nao resolveu a partir do servidor no momento do teste. Pode ser DNS, nome incorreto, ou diferenca entre rede do servidor e acesso externo.
- Header local do app tem `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`, mas nao mostrou `Strict-Transport-Security`. HSTS normalmente deve ficar na camada HTTPS/proxy.

### Novos agrupamentos de correcao

#### Grupo K - SEO/indexacao

- `src/app/(shop)/layout.tsx`
  - Metadata default, OpenGraph e canonical base.
- `src/app/(shop)/produtos/[slug]/page.tsx`
  - `generateMetadata` dinamico por produto.
- `src/app/(shop)/page.tsx`
- `src/app/(shop)/produtos/page.tsx`
- `src/app/(shop)/ofertas/page.tsx`
- `src/app/(shop)/cupons/page.tsx`
- `src/app/(shop)/programa-de-fidelidade/page.tsx`
  - Titles/descriptions especificos.
- Paginas privadas:
  - `carrinho`, `checkout`, `conta`, `login`, `recuperar-senha`, `redefinir-senha`.
  - Adicionar `robots: { index: false }`.

#### Grupo L - Acessibilidade de formularios

- `src/app/(admin)/admin/(panel)/clientes/page.tsx`
- `src/app/(admin)/admin/(panel)/engajamento/page.tsx`
- `src/app/(admin)/admin/(panel)/suporte/page.tsx`
- `src/app/(shop)/cadastro/page.tsx`
- `src/app/(shop)/cadastro/google/page.tsx`
- `src/app/(shop)/produtos/page.tsx`
- `src/app/(shop)/redefinir-senha/page.tsx`
- `src/features/catalog/components/product-image-uploader.tsx`
- `src/features/media/components/media-upload-button.tsx`
- `src/features/newsletter/components/newsletter-form.tsx`
- `src/features/theme/components/theme-image-field.tsx`

#### Grupo M - Operacao e servidor

- Servidor Docker
  - Limpar imagens antigas apos confirmar uso.
- Backups
  - Criar rotina automatica de dump Postgres e backup MinIO.
- Proxy/SSL
  - Validar DNS publico e HSTS no Nginx Proxy Manager.
- Documentacao
  - Criar checklist de deploy, rollback e backup antes de migrations/importacoes.
