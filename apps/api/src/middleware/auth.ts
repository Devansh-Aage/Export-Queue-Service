import type { NextFunction, Request, Response } from "express";

import { verifyToken } from "../lib/auth.js";
import { AppError } from "./error.js";

export function authMiddleware(jwtSecret: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const token = req.cookies?.token;

      if (typeof token !== "string" || !token.trim()) {
        throw new AppError(401, "Missing or invalid auth token");
      }

      req.user = verifyToken(token.trim(), jwtSecret);
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
