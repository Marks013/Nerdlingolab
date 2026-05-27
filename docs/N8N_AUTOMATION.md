# Nerdlingolab + n8n Automation

Este projeto usa o n8n central em `/home/ubuntu/automation-hub` como pulso operacional, nao como dono da regra de negocio.

## Modelo atual

- O n8n chama `POST /api/cron/automation` a cada 5 minutos.
- O backend do Nerdlingolab decide o que deve executar.
- Filas leves rodam a cada pulso:
  - `billing-queue`
  - `newsletter-queue`
- Rotinas pesadas ou sensiveis possuem janela minima persistente:
  - `dropshipping-sync`
  - `loyalty-marketing`

Esse desenho evita duplicidade e impede que agendamento externo force envios ou syncs fora da cadencia do sistema.

## Endpoints operacionais

### `POST /api/cron/automation`

Executa o pulso operacional. Requer o segredo dedicado de automacao:

```txt
Authorization: Bearer <NERDLINGOLAB_AUTOMATION_SECRET>
```

Nao use `AUTH_SECRET`, `NEXTAUTH_SECRET` ou secrets gerais de sessao para automacoes.

Resposta esperada:

```json
{
  "ok": true,
  "results": [
    { "jobKey": "billing-queue", "state": "ran" },
    { "jobKey": "newsletter-queue", "state": "ran" },
    { "jobKey": "dropshipping-sync", "state": "skipped" },
    { "jobKey": "loyalty-marketing", "state": "skipped" }
  ]
}
```

Estados possiveis:

- `ran`: executou.
- `skipped`: o proprio backend decidiu aguardar a proxima janela.
- `failed`: a rotina falhou; o n8n deve alertar.

### `GET /api/admin/ops/status`

Mostra health operacional para monitoramento sem acesso direto ao banco. Requer o mesmo bearer token.

Retorna:

- health de banco e backup;
- filas de billing/newsletter;
- status de automacoes internas;
- alertas de dropshipping;
- sinais de suporte/comercio;
- warnings sem payload bruto ou secrets.

## Variaveis relevantes

- `NERDLINGOLAB_AUTOMATION_SECRET`: segredo usado pelo n8n.
- `BACKUP_STATUS_DIR`: diretorio montado no web container para ler marcadores de backup.
- `NERDLINGOLAB_DROPSHIPPING_MIN_INTERVAL_MINUTES`: janela minima do sync de fornecedores, padrao 1440.
- `NERDLINGOLAB_MARKETING_MIN_INTERVAL_MINUTES`: janela minima da automacao de fidelidade, padrao 1440.

## O que nao deve voltar

Nao recriar:

- containers `nerdlingolab-billing-cron` ou `nerdlingolab-newsletter-cron`;
- scripts host ou scripts de repositorio para disparar `marketing` ou `dropshipping` fora do `/api/cron/automation`;
- agendamentos diretos para billing/newsletter/dropshipping/marketing no crontab.

O backup diario permanece no crontab porque usa volumes locais e `docker compose --profile backup`.

## Validacao rapida

No servidor:

```bash
cd /home/ubuntu/automation-hub
set -a && . ./.env && set +a
docker run --rm --network automation_backend curlimages/curl:8.7.1 \
  -sS -X POST -H "Authorization: Bearer ${NERDLINGOLAB_AUTOMATION_SECRET}" \
  http://nerdlingolab-web:3000/api/cron/automation | jq
docker run --rm --network automation_backend curlimages/curl:8.7.1 \
  -sS -H "Authorization: Bearer ${NERDLINGOLAB_AUTOMATION_SECRET}" \
  http://nerdlingolab-web:3000/api/admin/ops/status | jq
```

O status pode ser `degraded` por alerta real de negocio, por exemplo fontes de dropshipping pendentes de configuracao.
