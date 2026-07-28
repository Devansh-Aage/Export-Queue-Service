import { Router } from "express";

import {
  authBodySchema,
  createAuthController,
} from "../controllers/auth.js";
import type { Env } from "../env.js";
import { validateBody } from "../middleware/error.js";

export function createAuthRouter(env: Env): Router {
  const router = Router();
  const auth = createAuthController(env);

  router.post("/register", validateBody(authBodySchema), auth.register);
  router.post("/login", validateBody(authBodySchema), auth.login);

  return router;
}
