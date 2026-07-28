# Export Service

Turborepo monorepo for dataset export jobs.

## Structure

```
apps/
  api/       Express + Zod HTTP API (enqueues export jobs)
  worker/    BullMQ worker (processes export jobs)
packages/
  prisma/    Prisma client + PostgreSQL schema
  queue/     Redis connection + BullMQ queues/workers/job schemas
  eslint-config/
  typescript-config/
storage/     Local dataset / export files
```

## Prerequisites

- Node.js >= 20
- pnpm 9
- PostgreSQL
- Redis

## Setup

```sh
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:push
```

## Develop

```sh
# API + worker + package watchers
pnpm dev

# Or individually
pnpm dev:api
pnpm dev:worker
```

## API

- `GET /health` — health check
- `POST /exports` — create export job `{ "datasetId": "...", "format": "json" }`
- `GET /exports/:id` — job status

## Scripts

| Script | Description |
| --- | --- |
| `pnpm build` | Build all packages/apps |
| `pnpm check-types` | Typecheck |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:push` | Push schema to DB |
| `pnpm db:studio` | Open Prisma Studio |
