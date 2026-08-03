import { Redis } from "ioredis";

export const connection = new Redis(
  process.env.REDIS_URL ?? "redis://redis:6379",
  {
    maxRetriesPerRequest: null,
  },
);
