# Auditoria funcional - Sistema de avaliações

Data: 2026-05-01
Escopo: tema admin/loja, aviso global de suporte e fluxo de avaliação de produtos.

## Correções aplicadas

- Tema escuro do admin: criado controlador de escopo por rota para impedir que a classe `dark` aplicada no admin vaze para a loja durante navegação client-side.
- Aviso de suporte: removido popup local da página `/suporte`; agora o aviso é global, ignora apenas `/admin`, depende de usuário logado via API e só mostra respostas recentes ainda não vistas.
- Review publicado: ação de recusar agora bloqueia avaliações já publicadas ou recompensadas; para esse caso o admin deve usar ocultar.
- Limpeza de mídia recusada: falhas na remoção de mídia rejeitada passam a ser capturadas no Sentry.

## Fluxo de cliente auditado

- Envio de avaliação exige sessão autenticada.
- Avaliação é vinculada a item de pedido do próprio usuário.
- Elegibilidade respeita entrega finalizada por padrão.
- Nota é limitada entre 1 e 5.
- Texto tem limite de tamanho.
- Mídias precisam ter sido enviadas pelo mesmo usuário e com `source = REVIEW`.
- Upload de avaliação tem rota dedicada e valida MIME, assinatura, tamanho e sessão.

## Fluxo admin auditado

- `/admin/avaliacoes` lista pendentes, publicadas e arquivadas.
- Publicar é o único caminho que libera recompensa.
- Recompensa tem idempotência por `product-review:{reviewId}` no caso Nerdcoins.
- Cupom é privado, vinculado ao cliente, uso único e com valor configurado em reais no admin.
- Ocultar preserva histórico e recompensa.
- Recusar remove vínculo de mídia e tenta remover arquivo do storage.

## Exibição pública auditada

- Produto exibe apenas avaliações com `status = PUBLISHED` e `publicConsent = true`.
- Imagens usam `SafeImage`.
- Vídeos usam `controls` e `preload="metadata"` para evitar autoplay pesado.
- Se não houver avaliações publicadas, a seção não aparece.

## Riscos residuais

- Mídias enviadas e nunca submetidas em uma avaliação ainda podem ficar órfãs; recomendação: rotina futura para apagar `MediaAsset` com `source = REVIEW`, sem uso em `ProductReviewMedia`, após 24-48h.
- Vídeo curto é validado no cliente por duração e no servidor por tamanho/MIME; validação de duração 100% server-side exigiria leitura de metadata de vídeo no backend.
- Recompensa de avaliação publicada não é revertida automaticamente se o admin ocultar depois; decisão preserva histórico financeiro e evita retirar benefício já concedido.
