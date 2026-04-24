# NerdLingoLab Commerce

E-commerce Next.js para a NerdLingoLab, com vitrine em PT-BR, carrinho, checkout,
admin, Mercado Pago, fidelidade, Postgres, MinIO e validações operacionais.

## Setup local

1. Copie `.env.example` para `.env` e preencha os valores locais.
2. Suba os serviços:

```bash
docker compose up -d
```

3. Prepare banco e dados iniciais:

```bash
npx prisma migrate dev --name init
npm run db:seed
```

4. Rode a aplicação:

```bash
npm run dev
```

## Validação

```bash
npm run validate:project
npm run check:operational
npm run build
npm run test:e2e
```

Para E2E local no Windows, o Playwright usa `npm run dev:webpack`.
