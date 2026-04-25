FROM node:22-alpine AS base

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder

ENV AUTH_SECRET="temporary-build-auth-secret-change-me-64-characters-minimum-000000000000"
ENV DATABASE_URL="postgresql://nerdlingolab:temporary-postgres-password-change-me@postgres:5432/nerdlingolab?schema=public"
ENV NEXT_TELEMETRY_DISABLED="1"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM base AS runner

ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED="1"
ENV NODE_ENV="production"
ENV PORT="3000"

COPY --chown=node:node --from=builder /app/.next ./.next
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/package-lock.json ./package-lock.json
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node --from=builder /app/public ./public

USER node

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm run start"]
