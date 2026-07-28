import { Redis } from "ioredis";

export type RedisConnectionOptions = {
  url?: string;
  maxRetriesPerRequest?: number | null;
};

export function createRedisConnection(
  options: RedisConnectionOptions = {},
): Redis {
  const url = options.url ?? process.env.REDIS_URL ?? "redis://localhost:6379";

  return new Redis(url, {
    maxRetriesPerRequest: options.maxRetriesPerRequest ?? null,
  });
}
