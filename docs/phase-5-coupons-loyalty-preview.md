# Fase 5: Cupons e Fidelidade no Carrinho

## Entregue

- `/api/cart/validate` aceita `couponCode` e `loyaltyPointsToRedeem`.
- Validacao server-side recalcula subtotal, desconto de cupom, desconto por pontos e total.
- Cupons validam status, datas, limite global, subtotal minimo e limite por cliente autenticado.
- Fidelidade consulta `LoyaltyPoints` do usuario autenticado e limita resgate ao saldo e subtotal disponivel.
- Admin de cupons em `/admin/cupons`, com criacao, listagem e desativacao.

## Decisoes

- Nesta fase, 1 ponto equivale a 1 centavo de desconto.
- Frete gratis e reconhecido no modelo, mas ainda nao altera total porque o modulo de frete nao existe.
- Resgates e incrementos de uso ainda nao gravam ledger; isso acontecera na criacao do pedido e confirmacao de pagamento.

## Proxima fase sugerida

Criar checkout interno: gerar pedido `PENDING_PAYMENT`, registrar cupom/pontos reservados e criar preferencia Mercado Pago.
