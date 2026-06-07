# Handoff operacional consolidado

Este documento resume os pontos essenciais para manter a NerdLingoLab pronta para produção, com foco em rotinas críticas, validações e cuidados antes de novas implantações.

## Estado atual

- A loja roda em Docker no servidor de produção.
- O app principal, banco, armazenamento e coletor de fornecedores devem permanecer separados.
- A captura assistida de fornecedores deve atualizar apenas dados confiáveis e evitar falsos alertas de estoque.
- Produtos de dropshipping podem permanecer ativos sem controle de estoque físico quando o estoque estiver desativado no cadastro.

## Rotinas críticas

- Validar o projeto local com `npm run validate:project`.
- Validar prontidão operacional com `npm run check:operational`.
- Validar vulnerabilidades com `npm audit --omit=dev`.
- Conferir saúde em produção com `docker compose ps` e `/api/health/ready`.
- Fazer build no servidor antes de considerar uma versão pronta para público.

## Fornecedores e captura assistida

- A coleta automática deve preservar preços existentes quando a origem não entrega preço confiável.
- Links da Shopee não devem gerar alerta de falta de estoque sem evidência confiável.
- Itens sem preço de origem confiável devem ir para revisão manual somente quando houver necessidade real de ação.
- CSVs de fornecedores devem manter origem, URL, fornecedor, status, preço e estoque para correspondência precisa.

## Pedidos, pagamentos e estornos

- Webhooks do Mercado Pago devem manter pedido e pagamento sincronizados.
- Pedido cancelado pelo usuário ou pelo admin deve registrar justificativa quando aplicável.
- Pedido pago cancelado deve acionar fluxo de estorno conforme integração disponível.
- Mudanças importantes de pedido devem disparar e-mail usando template adequado.

## Segurança e operação

- Não imprimir segredos, tokens, chaves privadas ou arquivos `.env` completos em logs.
- Manter HTTPS forçado no proxy.
- Manter dependências sem vulnerabilidades conhecidas.
- Revisar permissões de admin, cupons, fornecedores, pedidos e NerdCoins antes de inauguração.

## Checklist antes de produção

1. `npm run validate:project`
2. `npm run check:operational`
3. `npm audit --omit=dev`
4. `docker compose config --quiet`
5. `docker compose build app`
6. `docker compose up -d app`
7. `curl -fsS http://127.0.0.1:3001/api/health/ready`

## Pendências que exigem decisão

- Para captura de preço mais confiável em marketplaces, avaliar API oficial ou perfil autenticado controlado.
- Para monitoramento externo, manter alerta de SSL, disponibilidade e healthcheck fora do servidor.
