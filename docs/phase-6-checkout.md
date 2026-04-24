# Fase 6: Checkout Interno e Mercado Pago

## Entregue

- Pagina `/checkout` com formulario de cliente e endereco.
- Rota `/api/checkout` que revalida carrinho, cupom e pontos no servidor.
- Criacao de pedido `PENDING_PAYMENT` com itens e snapshots de cliente/endereco/produto.
- Preferencia Mercado Pago com `external_reference`, `notification_url` e `back_urls`.
- Rota inicial `/api/webhooks/mercadopago` para persistir notificacoes idempotentes.
- Pagina `/checkout/retorno` para retorno do Mercado Pago.

## Decisoes

- O pedido e criado antes do pagamento; baixa de estoque, uso de cupom e ledger de pontos ficam para webhook aprovado.
- A preferencia Mercado Pago usa um item agregado com o total final revalidado para evitar item negativo de desconto.
- Pedidos com total zero por pontos ainda nao sao habilitados.

## Proxima fase sugerida

Implementar processamento real do webhook Mercado Pago: validar pagamento, marcar pedido como pago, baixar estoque, incrementar uso do cupom e gravar `LoyaltyLedger`.
