import { prisma } from "@repo/prisma";
import type { CookieOptions, NextFunction, Request, Response } from "express";
import { z } from "zod";

import type { Env } from "../env.js";
import { hashPassword, signToken, verifyPassword } from "../lib/auth.js";
import { sendNoContent } from "../lib/response.js";
import { AppError } from "../middleware/error.js";

export const authBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type AuthBody = z.infer<typeof authBodySchema>;

function cookieOptions(env: Env): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function setAuthCookie(res: Response, token: string, env: Env): void {
  res.cookie("token", token, cookieOptions(env));
}

export function createAuthController(env: Env) {
  return {
    async register(
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        const { email, password } = req.body as AuthBody;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          throw new AppError(409, "Email already registered");
        }

        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
          data: { email, password: hashedPassword },
          select: { id: true, email: true },
        });

        const token = signToken(user, env.JWT_SECRET, env.JWT_EXPIRES_IN);
        setAuthCookie(res, token, env);
        sendNoContent(res);
      } catch (error) {
        next(error);
      }
    },

    async login(
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      try {
        const { email, password } = req.body as AuthBody;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          throw new AppError(401, "Invalid email or password");
        }

        const valid = await verifyPassword(password, user.password);
        if (!valid) {
          throw new AppError(401, "Invalid email or password");
        }

        const authUser = { id: user.id, email: user.email };
        const token = signToken(authUser, env.JWT_SECRET, env.JWT_EXPIRES_IN);
        setAuthCookie(res, token, env);
        sendNoContent(res);
      } catch (error) {
        next(error);
      }
    },
  };
}
