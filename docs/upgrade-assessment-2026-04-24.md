# Avaliação de atualização - 24/04/2026

## Atualizado agora

- Next.js para `16.2.4`: remove a linha vulnerável antiga e mantém compatibilidade com Sentry.
- React e React DOM para `19.2.5`: melhora compatibilidade com regras novas de renderização.
- Sentry para `10.50.0`: telemetria compatível com Next 16.
- Recharts para `3.8.1`: gráficos atuais para relatórios.
- Zod para `4.3.6`: validação mais recente; `z.nativeEnum` foi trocado por `z.enum`.
- Mercado Pago, MinIO, React Hook Form, TanStack Query, Resend, React Email, Lucide, Zustand e utilitários foram atualizados para versões atuais compatíveis.
- ESLint passou para a configuração flat exportada pelo `eslint-config-next`.
- Prisma recebeu `prisma.config.ts`, removendo o aviso de configuração `package.json#prisma`.

## Mantido por compatibilidade

- Prisma ficou fixado em `6.19.3`. Prisma 7 exige novo client fora de `node_modules`, adapter PostgreSQL explícito e revisão de imports em toda a aplicação.
- Tailwind CSS ficou em `3.4.19`. Tailwind 4 exige migração do pipeline CSS e revisão dos tokens do tema.
- ESLint ficou em `9.39.4`. ESLint 10 conflita com plugins transitivos usados por `eslint-config-next@16.2.4`.
- Next canary `16.3.0-canary.2` foi testado e recusado por conflito de peer com Sentry.
- React canary de 23/04/2026 foi recusado por risco de integração com Next/Sentry sem ganho direto para o e-commerce nesta fase.

## Ganhos

- Menor exposição a vulnerabilidades conhecidas do Next antigo.
- Regras de lint mais rígidas para renderização e performance.
- Validação de formulários alinhada ao Zod 4.
- Configuração Prisma preparada para a próxima migração maior.
- Gráficos e relatórios usando versões atuais.

## Perdas e riscos

- Next 16 pode exigir atenção extra em deploy e cache.
- React 19 e lint novo tornam padrões antigos menos tolerados.
- Prisma 7 e Tailwind 4 ainda precisam de fases próprias para evitar regressões em dados e visual.
- Pacotes canary foram evitados porque reduzem previsibilidade em checkout, pedidos e fidelidade.
