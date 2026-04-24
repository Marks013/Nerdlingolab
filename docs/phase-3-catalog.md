# Fase 3: Catalogo Inicial

## Entregue

- Admin de categorias em `/admin/categorias`.
- Admin de produtos em `/admin/produtos`, com criacao, edicao e arquivamento.
- Server Actions com Zod para validar payloads no servidor.
- Criacao de variante padrao e ledger inicial de estoque no cadastro do produto.
- Vitrine publica em `/produtos` e detalhe em `/produtos/[slug]`.
- Produtos publicos filtram apenas status `ACTIVE` com estoque positivo.

## Decisoes

- Precos continuam em centavos no banco; inputs aceitam formato monetario em texto.
- Upload real de imagens para MinIO ainda nao foi conectado; nesta fase o admin aceita URLs de imagem.
- Arquivar produto e preferido a delete fisico para preservar historico de pedidos e auditoria.

## Proxima fase sugerida

Implementar carrinho com Zustand, validacao server-side de carrinho e esqueleto de checkout.
