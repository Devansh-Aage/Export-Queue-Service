import { Router } from "express";
import type { Worker } from "bullmq";

import type { ExportJobData } from "@repo/queue";
import redis from "../lib/redis.js";

export function createHealthRouter(worker: Worker<ExportJobData>): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    let redisOk = false;
    try {
      redisOk = (await redis.ping()) === "PONG";
    } catch {
      redisOk = false;
    }

    const running = worker.isRunning();
    const ok = redisOk && running;

    res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "degraded",
      service: "worker",
      redis: redisOk,
      running,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
