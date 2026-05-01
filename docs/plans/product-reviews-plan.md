# Plano funcional - Avaliações de produtos pós-compra

Data: 2026-05-01
Escopo: criar sistema de avaliação por produto comprado, com moderação admin, mídia opcional, publicação na página do produto e recompensa por aprovação.

## Objetivo

Permitir que clientes avaliem produtos após compra finalizada, enviem texto, nota, imagens e vídeos curtos. O admin revisa cada avaliação, aprova ou rejeita, decide se ela será exibida no produto e, quando aprovada/publicada, libera recompensa configurável: cupom com valor em reais definido no admin ou Nerdcoins.

## Fluxo do Cliente

1. Pedido elegível quando `paymentStatus = PAID` e pedido estiver entregue/finalizado.
2. Em `/conta/pedidos/[id]`, cada item elegível exibe botão `Avaliar produto`.
3. Formulário de avaliação:
   - nota de 1 a 5;
   - título curto;
   - comentário;
   - seleção opcional de imagens;
   - seleção opcional de vídeo curto;
   - aceite de uso público da avaliação/mídia.
4. Após envio, avaliação fica como `PENDING`.
5. Cliente vê status: em análise, aprovada, publicada, rejeitada ou recompensada.

## Fluxo Admin

1. Criar área `/admin/avaliacoes`.
2. Listas separadas:
   - pendentes;
   - aprovadas/publicadas;
   - rejeitadas;
   - recompensadas.
3. Card de análise mostra cliente, pedido, produto, nota, texto, mídia e histórico.
4. Ações:
   - aprovar sem publicar;
   - aprovar e publicar no produto;
   - rejeitar com motivo;
   - ocultar avaliação publicada;
   - liberar recompensa manualmente se necessário.
5. Quando publicar:
   - avaliação aparece na página do produto em seção dedicada;
   - recompensa é criada uma única vez por avaliação.

## Banco de Dados

Novos modelos sugeridos:

- `ProductReview`
  - `id`, `productId`, `variantId`, `orderId`, `orderItemId`, `userId`
  - `rating`, `title`, `body`
  - `status`: `PENDING`, `APPROVED`, `PUBLISHED`, `REJECTED`, `HIDDEN`
  - `adminNotes`, `rejectionReason`
  - `rewardType`: `COUPON`, `NERDCOINS`, `NONE`
  - `rewardCouponId`, `rewardPoints`, `rewardGrantedAt`
  - `publishedAt`, `createdAt`, `updatedAt`
  - índice único por `orderItemId + userId`

- `ProductReviewMedia`
  - `id`, `reviewId`, `assetId`, `mediaType`, `sortOrder`
  - reaproveitar `MediaAsset` para storage, metadados e remoção segura.

- `ProductReviewSettings`
  - `singletonKey`
  - `isEnabled`
  - `requireDeliveredOrder`
  - `allowImages`
  - `allowVideos`
  - `maxImages`
  - `maxVideos`
  - `maxVideoSeconds`
  - `rewardMode`: `COUPON`, `NERDCOINS`, `NONE`
  - valor do cupom configurado em reais no admin
  - `nerdcoinsRewardPoints`
  - `couponExpiresInDays`

## Recompensa

Regra padrão:

- Cupom privado, vinculado ao cliente, uso único, validade configurável e valor definido em reais no admin.

Alternativa:

- Nerdcoins configuráveis, lançados via `LoyaltyLedger` com `idempotencyKey = product-review:{reviewId}`.

Proteções:

- recompensa só após aprovação/publicação;
- idempotência para evitar cupom/pontos duplicados;
- admin pode ver se recompensa já foi liberada.
- ao recusar uma avaliação, imagens e vídeos anexados são desvinculados e removidos do storage para não ocupar espaço com mídia rejeitada.

## UI e Interface

Cliente:

- Formulário simples, mobile first, com upload claro e preview.
- Status visual da avaliação no pedido.
- Mensagens curtas, sem linguagem técnica.

Produto:

- Seção `Avaliações de clientes`.
- Média de estrelas, total de avaliações e lista paginada.
- Galeria de imagens/vídeos dentro da avaliação.
- Não carregar vídeos automaticamente; usar thumbnail/play.

Admin:

- Cards densos, escaneáveis e separados por status.
- Filtros por produto, nota, status, data e recompensa.
- Preview da avaliação como aparecerá no produto.
- Ações claras: aprovar, publicar, rejeitar, ocultar.

## Desempenho

- Página do produto deve buscar avaliações publicadas com paginação.
- Calcular média e quantidade por agregação no banco.
- Usar lazy loading para mídia.
- Vídeos curtos devem ter limite de tamanho/duração.
- Evitar incluir mídia pesada no HTML inicial.
- Criar índices em `productId`, `status`, `publishedAt`, `userId`, `orderItemId`.

## Segurança e Qualidade

- Validar propriedade do pedido antes de permitir avaliação.
- Permitir apenas pedidos pagos e finalizados/entregues.
- Validar MIME, tamanho e duração da mídia.
- Guardar moderação admin com data e usuário admin quando possível.
- Sanitizar texto exibido.
- Rate limit no envio de avaliações.
- Recompensa com transação e idempotência.

## Etapas de Implantação

1. Criar migrations Prisma para reviews, mídia e configurações.
2. Criar schemas de validação e server actions.
3. Integrar formulário no detalhe do pedido do cliente.
4. Criar upload/seleção de mídia para reviews.
5. Criar painel `/admin/avaliacoes` e navegação admin.
6. Criar publicação na página do produto.
7. Criar rotina de recompensa por aprovação/publicação.
8. Criar tela de configuração em admin/engajamento ou admin/avaliacoes.
9. Rodar testes de contrato, build, typecheck e smoke visual.

## Critérios de Aceite

- Cliente só avalia item comprado e elegível.
- Uma avaliação por item de pedido.
- Admin consegue aprovar, publicar, rejeitar e ocultar.
- Avaliação publicada aparece no produto correto.
- Imagem e vídeo curto aparecem com preview e sem quebrar mobile.
- Recompensa é liberada uma única vez.
- Cupom/Nerdcoins ficam rastreáveis no admin.
- Build, typecheck, lint e auditorias passam.

## Riscos e Decisões

- Vídeo exige limites rígidos para não pesar storage e página.
- Publicar avaliação diretamente na descrição HTML do produto não é ideal; melhor criar seção dedicada na página do produto. Se for obrigatório inserir na descrição, fazer como bloco gerado e controlado, nunca concatenar texto manual sem sanitização.
- Recompensa por aprovação pode incentivar spam; por isso o gatilho deve ser aprovação/publicação admin, não envio.
