import { Router } from "express";

import {
  createExport,
  createExportBodySchema,
  getMetrics,
} from "../controllers/export.js";
import type { Env } from "../env.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateBody } from "../middleware/error.js";

export function createExportRouter(env: Env): Router {
  const router = Router();

  router.post(
    "/",
    authMiddleware(env.JWT_SECRET),
    validateBody(createExportBodySchema),
    createExport,
  );

  router.get("/metrics", authMiddleware(env.JWT_SECRET), getMetrics);

  return router;
}
