# Política de Texto da Interface

## Regra principal

A interface da loja e do admin deve falar com clientes e operadores, não com desenvolvedores.

## Proibido em páginas, cards, botões e mensagens visíveis

- Backend, Back-end, back end.
- Frontend, Front-end, front end.
- Dev, desenvolvimento, staging, produção como orientação técnica.
- Prisma, Next.js, Sentry, webhook, API, servidor, banco de dados, schema.
- Explicações como "revalidado no servidor", "snapshot", "base pronta", "fundação".

## Onde colocar orientação técnica

Qualquer explicação de arquitetura, implantação, integração, encoding, Mercado Pago, MinIO ou banco deve ficar em arquivos locais dentro de `docs/`.

## Validação

Use `npm run validate:ui-copy` para bloquear essas menções na UI.
