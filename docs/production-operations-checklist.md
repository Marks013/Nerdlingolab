# Checklist Operacional de Produção

Use este checklist antes do lançamento e em toda mudança relevante de infraestrutura, pagamentos ou banco.

## Backup e Restore

- [ ] Definir política de backup automático do Postgres com retenção mínima de 7 dias para snapshots diários e 30 dias para backups semanais.
- [ ] Habilitar backup antes de cada deploy com migration Prisma.
- [ ] Armazenar backups fora da mesma máquina/região do banco principal.
- [ ] Documentar local dos backups, credenciais de acesso e responsáveis.
- [ ] Executar teste de restore em ambiente isolado pelo menos mensalmente.
- [ ] Validar no restore: usuários, pedidos, itens de pedido, cupons, ledger de fidelidade, webhooks e estoque.
- [ ] Registrar tempo real de recuperação, tamanho do backup e hash/identificador do artefato restaurado.
- [ ] Manter plano de rollback para migrations destrutivas ou alterações de schema sensíveis.

## Monitoramento de Pagamentos

- [ ] Configurar Mercado Pago em modo produção apenas com chaves reais e segredo de webhook fora do repositório.
- [ ] Criar alerta para aumento de pagamentos recusados, pendentes por mais de 30 minutos ou divergência entre pedido e pagamento.
- [ ] Conferir diariamente pedidos `PENDING` ou `PAID` sem atualização correspondente de fulfillment.
- [ ] Registrar `paymentId`, status bruto do gateway e status normalizado do pedido em logs estruturados.
- [ ] Validar fluxo sandbox antes de cada release: aprovado, recusado, pendente, cancelado e reembolso.
- [ ] Criar rotina de conciliação entre pedidos locais e relatórios do Mercado Pago.
- [ ] Garantir que confirmação de pagamento nunca dependa apenas do retorno do navegador.

## Webhooks Idempotentes

- [ ] Confirmar que cada webhook usa identificador único externo para impedir processamento duplicado.
- [ ] Persistir payload bruto, provedor, status, erro e data de processamento.
- [ ] Validar assinatura/segredo antes de qualquer mutação no banco.
- [ ] Processar eventos repetidos sem duplicar estoque, pontos de fidelidade, cupom, pedido ou shipment.
- [ ] Registrar falhas com motivo claro e permitir reprocessamento controlado por admin/script.
- [ ] Criar alerta para webhooks recebidos e não processados após 10 minutos.
- [ ] Testar replay do mesmo evento em staging e confirmar que o resultado final permanece igual.

## Alerta de Readiness

- [ ] Monitorar `GET /api/health/ready` a cada 1 minuto em produção.
- [ ] Alertar quando houver 2 falhas consecutivas ou latência acima de 2 segundos.
- [ ] Incluir no alerta: status HTTP, tempo de resposta, host, ambiente e últimos erros do app.
- [ ] Tratar `503` como indisponibilidade de dependência crítica, especialmente banco.
- [ ] Validar separadamente `GET /api/health` para diferenciar app vivo de app pronto.
- [ ] Publicar painel com disponibilidade das últimas 24h, 7 dias e 30 dias.
- [ ] Testar o alerta manualmente antes do lançamento.

## Revisão Antes do Go-Live

- [ ] `npm run validate:project`
- [ ] `npm run check:operational`
- [ ] `npm run build`
- [ ] `npm audit`
- [ ] Teste manual de compra sandbox completo.
- [ ] Teste manual de login/admin/pedidos/cupons/fidelidade.
- [ ] Teste de restore recente aprovado.
- [ ] Alerta de `/api/health/ready` disparando para falha simulada.

## Backlog Funcional Solicitado

- [ ] Adicionar login e cadastro com Google mantendo coleta obrigatoria de CPF, data de nascimento, aceite dos Termos de Uso e aceite da Politica de Privacidade.
- [ ] Bloquear conclusao do cadastro Google enquanto CPF, data de nascimento e aceites legais estiverem pendentes.
- [ ] Ocultar formulario de endereco no checkout/carrinho quando o cliente ja tiver endereco cadastrado, exibindo apenas a selecao de endereco e o botao "Adicionar outro endereco".
- [ ] Manter formulario de endereco aberto quando o cliente ainda nao tiver endereco salvo.
- [ ] Permitir definir endereco principal e usar este endereco automaticamente no carrinho e no checkout.
