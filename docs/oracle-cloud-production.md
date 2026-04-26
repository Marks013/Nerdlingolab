# Produção Oracle Cloud com Docker Compose

Este projeto está preparado para subir em Ubuntu na Oracle Cloud sem depender do banco local de desenvolvimento. O CSV de produtos fica versionado em `data/shopify/products_export_1.csv` e entra na imagem Docker.

## Primeira implantação

```bash
cp .env.docker.example .env
docker compose build
docker compose --profile setup run --rm setup
docker compose up -d app
```

Antes de rodar, edite o `.env`: `APP_URL`, `POSTGRES_PASSWORD`, `AUTH_SECRET`, `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `MINIO_ROOT_PASSWORD` e `S3_SECRET_ACCESS_KEY`.

## Nginx Proxy Manager

O container continua escutando `3000` internamente, mas o host publica `3001` por padrão via `APP_HOST_PORT=3001`. No Nginx Proxy Manager, aponte o domínio para:

```text
http://IP_DO_SERVIDOR:3001
```

Se você preferir outra porta porque `3001` também está em uso, altere apenas `APP_HOST_PORT` no `.env`.

## Atualizações futuras

```bash
docker compose build
docker compose --profile setup run --rm setup
docker compose up -d app
```

O bootstrap executa `prisma migrate deploy`, `prisma db seed` e `npm run import:shopify`. Ele é idempotente: cria/atualiza categorias e produtos por slug e recria as variantes dos produtos importados.

## Rede e dados

Postgres e MinIO ficam publicados apenas em `127.0.0.1` por padrão. Mantenha backup do volume `postgres_data` antes de migrations/importações em produção.
