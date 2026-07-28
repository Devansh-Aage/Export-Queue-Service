import type { NextFunction, Request, Response } from "express";

import { verifyToken } from "../lib/auth.js";
import { AppError } from "./error.js";

export function createAuthMiddleware(jwtSecret: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const header = req.headers.authorization;

      if (!header?.startsWith("Bearer ")) {
        throw new AppError(401, "Missing or invalid Authorization header");
      }

      const token = header.slice("Bearer ".length).trim();
      if (!token) {
        throw new AppError(401, "Missing or invalid Authorization header");
      }

      req.user = verifyToken(token, jwtSecret);
      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }

      next(new AppError(401, "Invalid or expired token"));
    }
  };
}
