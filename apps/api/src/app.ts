import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";

import type { Env } from "./env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { createAuthRouter } from "./routes/auth.js";
import { createExportRouter } from "./routes/export.js";
import { healthRouter } from "./routes/health.js";
import { rateLimiter } from "./middleware/rateLimit.js";
import { requestTimeout } from "./middleware/timeout.js";

export function createApp(env: Env): Express {
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
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(requestTimeout(15000));
  app.use(rateLimiter({ windowSec: 2, limit: 50 }));

  app.use("/health", healthRouter);
  app.use("/auth", createAuthRouter(env));
  app.use("/export", createExportRouter(env));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
