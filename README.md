# NerdLingoLab Commerce

E-commerce Next.js da NerdLingoLab com vitrine, carrinho, checkout, admin, Mercado Pago, fidelidade, Postgres, MinIO e validacoes operacionais.

## Guia de Comandos

Comece pelos guias abaixo quando estiver operando o servidor:

- [docs/server-command-guide.md](C:/Users/User/Desktop/NerdLingoLab/docs/server-command-guide.md)
- [docs/operacoes-docker-release.md](C:/Users/User/Desktop/NerdLingoLab/docs/operacoes-docker-release.md)

Os guias cobrem:

- `git pull`, `git commit`, `git push` e diagnostico de branch.
- `docker compose up`, `logs`, `restart`, `ps` e rebuild.
- Migrations do Prisma em desenvolvimento e producao.
- Atalhos do servidor: `nerd-build`, `nerd-manutencao-on` e `nerd-manutencao-off`.
- Scripts atuais do `package.json`.
- Biblioteca de midias e importacao de imagens externas.
- Sequencia recomendada para atualizar o site no servidor.

## Setup Local

1. Copie `.env.example` para `.env` e preencha os valores locais.
2. Instale as dependencias:

```bash
npm ci
```

3. Suba Postgres, MinIO e bucket local:

```bash
docker compose up -d postgres minio minio-create-bucket
```

4. Prepare banco e dados iniciais:

```bash
npm run setup
```

5. Rode a aplicacao:

```bash
npm run dev
```

## Servidor com Docker

Atalhos instalados no servidor:

```bash
nerd-build
nerd-manutencao-on
nerd-manutencao-off
```

`nerd-build` liga manutencao, atualiza o repositorio, rebuilda `setup` e `app`, aplica migrations, sobe o app, roda health/smoke e desliga manutencao se tudo passar.

Primeira instalacao:

```bash
docker compose --profile setup run --rm setup
docker compose up -d --build app
```

Atualizacao recomendada em producao:

```bash
nerd-build
```

Atualizacao manual comum:

```bash
git pull origin main
docker compose up -d --build app
docker compose run --rm --no-deps setup npm run db:deploy
docker compose restart app
```

Ver logs da aplicacao:

```bash
docker compose logs -f app
```

## Prisma

Criar migration em desenvolvimento:

```bash
npm run db:migrate
```

Aplicar migrations em producao/servidor:

```bash
npm run db:deploy
```

No servidor com Docker:

```bash
docker compose run --rm --no-deps setup npm run db:deploy
docker compose restart app
```

Se aparecer `P2021`, `P2022` ou mensagem de coluna/tabela inexistente, o banco esta sem uma migration nova ou existe drift. Rode o deploy de migrations antes de testar login/admin/checkout.

Gerar o client Prisma:

```bash
npm run prisma:generate
```

## Validacao

```bash
npm run validate:project
npm run check:operational
npm run build
npm run test:e2e
```

Para E2E local no Windows, o Playwright usa `npm run dev:webpack`.

## Scripts Principais

- `npm run dev`: roda o Next.js em desenvolvimento.
- `npm run build`: gera client Prisma e build de producao.
- `npm run start`: inicia a build de producao.
- `npm run lint`: roda ESLint.
- `npm run typecheck`: valida TypeScript.
- `npm run db:deploy`: aplica migrations pendentes.
- `npm run db:seed`: popula dados iniciais.
- `npm run release:docker`: executa `ops/release.sh`.
- `npm run audit:maintenance`: valida a pagina e o bypass de manutencao.
- `npm run import:shopify`: importa produtos do CSV configurado.
- `npm run media:import-external`: aplica migrations pendentes, baixa imagens externas para o storage interno e troca as URLs no banco.
- `npm run media:convert-webp`: aplica migrations pendentes, converte midias internas JPG/JPEG/PNG/GIF para WebP e atualiza produtos, slides e popups.
- `npm run validate:project`: roda validacoes e auditorias principais.
