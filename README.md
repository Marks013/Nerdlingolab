# NerdLingoLab Commerce

E-commerce Next.js para a NerdLingoLab, com vitrine em PT-BR, carrinho, checkout, admin, Mercado Pago, fidelidade, Postgres, MinIO e validações operacionais.

## Guia de comandos

Se você está no servidor e não lembra qual comando usar, comece por aqui:

[docs/server-command-guide.md](C:/Users/User/Desktop/NerdLingoLab/docs/server-command-guide.md)

O guia cobre:

- `git pull`, `git commit`, `git push` e diagnóstico de branch.
- `docker compose up`, `logs`, `restart`, `ps` e rebuild.
- Migrations do Prisma em desenvolvimento e produção.
- Scripts atuais do `package.json`.
- Biblioteca de mídias e importação de imagens externas.
- Sequência recomendada para atualizar o site no servidor.

## Setup local

1. Copie `.env.example` para `.env` e preencha os valores locais.
2. Instale as dependências:

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

5. Rode a aplicação:

```bash
npm run dev
```

## Servidor com Docker

Primeira instalação:

```bash
docker compose --profile setup run --rm setup
docker compose up -d --build app
```

Atualização comum depois de baixar uma versão nova:

```bash
git pull origin main
docker compose up -d --build
docker compose run --rm setup npm run db:deploy
docker compose restart app
```

Ver logs da aplicação:

```bash
docker compose logs -f app
```

## Prisma

Criar migration em desenvolvimento:

```bash
npm run db:migrate
```

Aplicar migrations em produção/servidor:

```bash
npm run db:deploy
```

No servidor com Docker:

```bash
docker compose run --rm setup npm run db:deploy
docker compose restart app
```

Se aparecer `P2021` ou `The table public.MarketingPopup does not exist`, o banco está sem uma migration nova. Rode o deploy de migrations acima antes de testar login/admin.

Gerar o client Prisma:

```bash
npm run prisma:generate
```

## Validação

```bash
npm run validate:project
npm run check:operational
npm run build
npm run test:e2e
```

Para E2E local no Windows, o Playwright usa `npm run dev:webpack`.

## Scripts principais

- `npm run dev`: roda o Next.js em desenvolvimento.
- `npm run build`: gera client Prisma e build de produção.
- `npm run start`: inicia a build de produção.
- `npm run lint`: roda ESLint.
- `npm run typecheck`: valida TypeScript.
- `npm run db:deploy`: aplica migrations pendentes.
- `npm run db:seed`: popula dados iniciais.
- `npm run import:shopify`: importa produtos do CSV configurado.
- `npm run media:import-external`: aplica migrations pendentes, baixa imagens externas para o storage interno e troca as URLs no banco.
- `npm run media:convert-webp`: aplica migrations pendentes, converte mídias internas JPG/JPEG/PNG/GIF para WebP e atualiza produtos, slides e popups.
- `npm run validate:project`: roda validações e auditorias principais.
