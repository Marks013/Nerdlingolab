# Fase 11: Área do Cliente

## Entregue

- Página `/conta` com dados do cliente, saldo de pontos e pedidos recentes.
- Página `/conta/pedidos/[id]` com detalhe do pedido do cliente autenticado.
- Queries separadas para pedidos do admin e pedidos do cliente.
- Acesso protegido por sessão e filtro por `userId`.

## Decisões

- O cliente só enxerga pedidos vinculados ao próprio usuário.
- A tela de entrada reutiliza a autenticação existente.
- A interface continua sem termos técnicos ou instruções de implementação.
