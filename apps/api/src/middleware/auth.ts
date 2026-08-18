import type { NextFunction, Request, Response } from "express";

import { verifyToken } from "../lib/auth.js";
import { AppError } from "./error.js";
import { prisma } from "@repo/prisma";

export function authMiddleware(jwtSecret: string) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const token = req.cookies?.token;

      if (typeof token !== "string" || !token.trim()) {
        throw new AppError(401, "Missing or invalid auth token");
      }

      req.user = verifyToken(token.trim(), jwtSecret);
      const userObj = await prisma.user.findFirst({
        where: {
          id: req.user.id,
        },
      });
      if (!userObj) {
        throw new AppError(401,"User doesn't exist!");
      }
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
