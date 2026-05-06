# Operacoes Docker, Release e Manutencao

Este guia e o caminho operacional recomendado para o servidor da NerdLingoLab.

Projeto no servidor:

```bash
cd /home/ubuntu/Nerdlingolab
```

## Atalhos de Producao

Os atalhos globais do servidor apontam para `/home/ubuntu/Nerdlingolab`.

```bash
nerd-build
nerd-manutencao-on
nerd-manutencao-off
```

- `nerd-build`: executa o release semi-automatico completo.
- `nerd-manutencao-on`: liga somente a pagina de manutencao e recria o app.
- `nerd-manutencao-off`: desliga somente a pagina de manutencao e recria o app.

## Release Recomendado

Use quando for atualizar producao com seguranca:

```bash
nerd-build
```

Fluxo executado:

1. Cria tag local de rollback da imagem atual, se existir.
2. Liga manutencao.
3. Executa `git pull --ff-only`.
4. Rebuilda as imagens `setup` e `app`.
5. Aplica migrations com `prisma migrate deploy`.
6. Sobe o app.
7. Aguarda `/api/health/ready`.
8. Testa home, cupons e pagina de manutencao.
9. Desliga manutencao se tudo passar.
10. Grava manifesto em `ops/releases/release-YYYYMMDDHHMMSS.env`.

Comando manual equivalente:

```bash
bash ops/release.sh
```

## Manutencao

Ligar:

```bash
nerd-manutencao-on
```

Desligar:

```bash
nerd-manutencao-off
```

Variaveis usadas:

```bash
MAINTENANCE_MODE="false"
MAINTENANCE_BYPASS_TOKEN=""
MAINTENANCE_MESSAGE=""
MAINTENANCE_RETRY_AFTER_SECONDS="900"
```

O bypass pode ser usado em auditorias:

```bash
curl -H "X-NerdLingoLab-Maintenance-Bypass: TOKEN" https://nerdlingolab.com/
```

Rotas liberadas durante manutencao:

- `/manutencao`
- `/admin`
- `/api/auth`
- `/api/health`
- `/api/media`
- `/api/webhooks/mercadopago`
- assets publicos essenciais

## Docker Compose

Ver containers:

```bash
docker compose ps
```

Subir stack:

```bash
docker compose up -d
```

Subir app com rebuild:

```bash
docker compose up -d --build app
```

Recriar app sem rebuild, recarregando `.env`:

```bash
docker compose up -d --no-deps --force-recreate app
```

Logs do app:

```bash
docker compose logs -f app
```

Logs recentes:

```bash
docker compose logs --tail=120 app
```

Reiniciar app:

```bash
docker compose restart app
```

Parar somente app:

```bash
docker compose stop app
```

## Migrations Prisma

Aplicar migrations em producao:

```bash
docker compose run --rm --no-deps setup npm run db:deploy
```

Ver status das migrations:

```bash
docker compose run --rm --no-deps setup npx prisma migrate status
```

Gerar Prisma Client no ambiente de build:

```bash
docker compose build setup
```

Nunca use `prisma migrate dev` em producao.

## Build Manual Seguro

Use somente quando precisar controlar etapa por etapa:

```bash
nerd-manutencao-on
git pull --ff-only
docker compose build setup app
docker compose run --rm --no-deps setup npm run db:deploy
docker compose up -d app
curl -fsS http://127.0.0.1:3001/api/health/ready
nerd-manutencao-off
```

## Smoke e Auditoria

Health interno:

```bash
curl -fsS http://127.0.0.1:3001/api/health/ready
```

Pagina de cupons:

```bash
curl -fsS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/cupons
```

Auditoria da manutencao:

```bash
npm run audit:maintenance
```

Auditoria esperando manutencao ativa:

```bash
EXPECT_MAINTENANCE=true AUDIT_BASE_URL=http://127.0.0.1:3001 npm run audit:maintenance
```

## Rollback

O `nerd-build` salva manifesto em `ops/releases/`.
Se o release falhar, a manutencao fica ligada por padrao para proteger a loja.

Ver manifestos:

```bash
ls -lah ops/releases
```

Se houver imagem rollback no manifesto, ela pode ser retagada manualmente:

```bash
docker tag nerdlingolab-commerce-app:rollback-YYYYMMDDHHMMSS nerdlingolab-commerce-app:latest
docker compose up -d --no-deps --force-recreate app
curl -fsS http://127.0.0.1:3001/api/health/ready
```

## Limpeza Operacional

Limpar build cache antigo:

```bash
docker builder prune -af --filter "until=168h"
```

Remover imagens soltas:

```bash
docker image prune -af --filter "until=168h"
```

Nao rode `docker volume prune` em producao sem revisar, pois volumes podem conter dados.
