# Fase 15 - Prontidão operacional

Esta fase adiciona verificações locais para garantir que a aplicação continua íntegra após as atualizações.

## Entregas

- configuração Playwright para desktop e mobile;
- teste de vitrine principal;
- teste de páginas públicas essenciais;
- teste de proteção da área administrativa;
- teste do endpoint de saúde;
- endpoint de prontidão para banco e storage;
- verificador local de arquivos, scripts e Prisma Client.
- proteção administrativa migrada para o padrão `src/proxy.ts` do Next 16.

## Comandos

- `npm run check:operational`
- `npm run test:e2e`
- `npm run validate:project`

Os testes de ponta a ponta sobem a aplicação localmente quando necessário.
