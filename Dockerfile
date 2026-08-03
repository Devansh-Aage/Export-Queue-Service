FROM node:20-bookworm-slim

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

CMD ["pnpm","--filter", "@repo/api","start"]