FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/queue/package.json ./packages/queue/
COPY packages/redis/package.json ./packages/redis/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config ./packages/eslint-config/

RUN pnpm install --frozen-lockfile

COPY . .
# need db_url cause prisma generate needs it when building
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/export_service?schema=public"

RUN pnpm build

RUN chown -R node:node /app
USER node

CMD ["pnpm","--filter", "@repo/api","start"]