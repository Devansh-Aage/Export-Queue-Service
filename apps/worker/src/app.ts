import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import type { Worker } from "bullmq";

import type { ExportJobData } from "@repo/queue";
import type { Env } from "./env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { createHealthRouter } from "./routes/health.js";
import { createMetricsRouter } from "./routes/metrics.js";

export function createApp(env: Env, worker: Worker<ExportJobData>): Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  app.use("/health", createHealthRouter(worker));
  app.use("/metrics", createMetricsRouter(worker));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
