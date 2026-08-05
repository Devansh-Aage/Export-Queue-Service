import { Router } from "express";

import {
  createExport,
  createExportBodySchema,
  getExport,
  getExportParamSchema,
  getMetrics,
} from "../controllers/export.js";
import type { Env } from "../env.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateBody, validateParams } from "../middleware/error.js";

export function createExportRouter(env: Env): Router {
  const router = Router();

  router.post(
    "/",
    authMiddleware(env.JWT_SECRET),
    validateBody(createExportBodySchema),
    createExport,
  );

  router.get("/metrics", authMiddleware(env.JWT_SECRET), getMetrics);

  router.get(
    "/:exportId",
    authMiddleware(env.JWT_SECRET),
    validateParams(getExportParamSchema),
    getExport,
  );

  return router;
}
