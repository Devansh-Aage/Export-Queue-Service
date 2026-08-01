# Export Service

Turborepo monorepo that exports datasets as ZIP archives. The API authenticates clients, creates export records, and enqueues BullMQ jobs; the worker zips dataset files from `storage/` into `outputs/`.

## Structure

```
apps/
  api/       Express HTTP API (auth, enqueue exports, queue metrics)
  worker/    BullMQ worker + health/metrics HTTP server
packages/
  prisma/    Prisma client + PostgreSQL schema
  queue/     Queue/job name constants + job payload types
  redis/     Shared ioredis connection
  eslint-config/
  typescript-config/
storage/     Local datasets (gitignored)
outputs/     Generated ZIP archives (gitignored)
```

## Prerequisites

- Node.js >= 20
- pnpm 9
- PostgreSQL
- Redis

## Setup

```sh
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET

pnpm install
pnpm db:generate
pnpm db:push
```

Optional: seed `Dataset` rows from folders under `storage/dataset/`:

```sh
pnpm --filter @repo/prisma db:seed
```

## Develop

```sh
# API + worker + package watchers
pnpm dev

# Or individually
pnpm dev:api
pnpm dev:worker
```

- API: `http://localhost:3000`
- Worker health/metrics: `http://localhost:3001`

## Environment

Copy `.env.example` to `.env` at the repo root. Both apps load it via `--env-file`.

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | — | PostgreSQL connection string (required) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `PORT` | `3000` | API HTTP port |
| `HOST` | `0.0.0.0` | API bind host |
| `JWT_SECRET` | — | JWT signing secret (required for API) |
| `JWT_EXPIRES_IN` | `7d` | JWT expiry |
| `WORKER_PORT` | `3001` | Worker HTTP port |
| `WORKER_HOST` | `0.0.0.0` | Worker bind host |
| `WORKER_CONCURRENCY` | `1` | BullMQ concurrency |
| `NODE_ENV` | `development` | Runtime environment |

## API

Auth uses an httpOnly `token` cookie set by register/login. Protected routes require that cookie.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Health check |
| `POST` | `/auth/register` | No | Register `{ "email", "password" }` (min 8 chars) → sets cookie, **204** |
| `POST` | `/auth/login` | No | Login with same body → sets cookie, **204** |
| `POST` | `/export` | Cookie | Create export `{ "datasetId": "<uuid>" }` → enqueues job, **201** |
| `GET` | `/export/metrics` | Cookie | Queue counts, DB status counts, stuck-job detection |

### Worker HTTP

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Redis ping + worker running status |
| `GET` | `/metrics` | No | Process, concurrency, and job stats |

## How it works

1. Client registers/logs in and receives a JWT cookie.
2. `POST /export` creates an `Export` row (`PENDING`) and enqueues a `process_export` job.
3. Worker sets status to `PROCESSING`, zips `storage/dataset/<dataset.name>/` into `outputs/<exportId>.zip`, then marks `COMPLETED` (or `FAILED` on final failure).

Statuses: `PENDING` → `PROCESSING` → `COMPLETED` | `FAILED`.

## Scripts

| Script | Description |
| --- | --- |
| `pnpm build` | Build all packages/apps |
| `pnpm check-types` | Typecheck |
| `pnpm lint` | Lint |
| `pnpm format` | Format with Prettier |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:push` | Push schema to DB |
| `pnpm db:studio` | Open Prisma Studio |

Production start after `pnpm build`:

```sh
pnpm --filter @repo/api start
pnpm --filter @repo/worker start
```
