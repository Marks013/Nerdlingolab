# Fase 4: Carrinho

## Entregue

- Store Zustand persistido em `localStorage`.
- Botao de adicionar ao carrinho na pagina de produto.
- Pagina `/carrinho` com alteracao de quantidade, remocao e limpeza.
- Endpoint `/api/cart/validate` que recalcula produto, preco, estoque e subtotal no servidor.
- Validacao consolida itens duplicados e remove variantes inativas, sem estoque ou de produtos nao publicados.

## Decisoes

- O client guarda snapshot apenas para UX; o total confiavel vem do Prisma.
- O checkout ainda fica desabilitado como proxima etapa, porque cupons, fidelidade, frete e Mercado Pago precisam ser integrados primeiro.
- A reserva/baixa de estoque nao acontece no carrinho; acontecera no pagamento aprovado/webhook.

## Proxima fase sugerida

Implementar cupons e resgate de pontos no resumo do carrinho, sempre revalidando no servidor.
