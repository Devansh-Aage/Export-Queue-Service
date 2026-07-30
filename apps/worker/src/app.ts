import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";

import type { Env } from "./env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

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
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
