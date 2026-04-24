# Fase 14 - Relatórios anuais

Esta fase adiciona uma visão anual ao painel administrativo com:

- receita confirmada por mês;
- pedidos pagos por mês;
- descontos aplicados por cupons e pontos;
- pontos emitidos e resgatados no ano atual.

A consulta central fica em `src/lib/reports/queries.ts` e retorna dados serializáveis para o componente de gráficos em `src/features/reports/components/annual-report-chart.tsx`.

As mensagens exibidas ao operador ficam restritas a termos de negócio, sem orientações técnicas na interface.
