# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base

WORKDIR /app

ENV NPM_CONFIG_AUDIT="false"
ENV NPM_CONFIG_FUND="false"
ENV NPM_CONFIG_UPDATE_NOTIFIER="false"

RUN apk add --no-cache libc6-compat openssl

FROM base AS deps

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline

FROM base AS builder

ENV AUTH_SECRET="temporary-build-auth-secret-change-me-64-characters-minimum-000000000000"
ENV DATABASE_URL="postgresql://nerdlingolab:temporary-postgres-password-change-me@postgres:5432/nerdlingolab?schema=public"
ENV NEXT_TELEMETRY_DISABLED="1"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM base AS setup

ENV NEXT_TELEMETRY_DISABLED="1"
ENV NODE_ENV="production"

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate

USER node

FROM base AS runner

ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED="1"
ENV NODE_ENV="production"
ENV PORT="3000"

COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node --from=builder /app/public ./public

USER node

EXPOSE 3000

CMD ["node", "server.js"]
