# Fase 13: Métricas do Painel

## Entregue

- Métricas reais no painel administrativo.
- Pedidos pagos totais e do dia.
- Pedidos pagos totais, do dia e do ano.
- Receita total, do dia e do ano.
- Total de produtos ativos.
- Pontos emitidos por recompensas no total e no ano.

## Decisões

- Métricas consideram apenas pedidos com pagamento aprovado.
- Receita usa `totalCents` dos pedidos pagos.
- Pontos emitidos usam apenas lançamentos de ganho.
- O recorte anual usa o ano corrente local do servidor.
