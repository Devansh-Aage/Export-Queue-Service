import { Router } from "express";
import type { Worker } from "bullmq";

import type { ExportJobData } from "@repo/queue";
import { createGetMetrics } from "../controllers/metrics.js";

export function createMetricsRouter(worker: Worker<ExportJobData>): Router {
  const router = Router();
  router.get("/", createGetMetrics(worker));
  return router;
}
