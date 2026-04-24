# Fase 7: Webhook Mercado Pago e Pos-Pagamento

## Entregue

- Webhook `/api/webhooks/mercadopago` persiste evento por `provider + externalEventId`.
- Processamento busca o pagamento no Mercado Pago pelo `paymentId` recebido no webhook.
- Pagamentos nao aprovados sao marcados como `IGNORED`.
- Pagamento aprovado atualiza o pedido para `PAID` / `APPROVED`.
- Baixa de estoque acontece em transacao, com `updateMany` guardando contra estoque negativo.
- `InventoryLedger` registra a venda com `idempotencyKey`.
- Cupom incrementa `usedCount` e cria `CouponRedemption` idempotente.
- Fidelidade grava `LoyaltyLedger` de resgate e ganho, atualiza saldo, lifetime totals e tier.

## Decisoes

- Cashback inicial: 5% do total pago, em pontos.
- Tiers seguem o modelo Joy/NerdLingoLab: Genin 0-2, Chunin 3-9, Jonin 10-19, Hokage 20+ pedidos.
- Estoque, cupom e fidelidade so sao efetivados apos pagamento aprovado.
- Webhooks repetidos nao duplicam ledger, cupom ou estoque porque o pedido aprovado e ignorado nas repeticoes.

## Proxima fase sugerida

Criar telas admin de pedidos e detalhe do pedido, com status de pagamento, itens, cliente, endereco, pontos e ledger.
