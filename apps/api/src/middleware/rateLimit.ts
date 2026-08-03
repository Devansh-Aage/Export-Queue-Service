import type { NextFunction, Request, Response } from "express";
import { redis } from "../lib/redis.js";
import { AppError } from "./error.js";


export function rateLimiter(opts: { windowSec: number; limit: number }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ipAddr = req.ip || req.socket.remoteAddress;
      if (!ipAddr) {
        throw new AppError(400, "Unable to determine client IP address");
      }

      const results = await redis
        .multi()
        .incr(ipAddr)
        .expire(ipAddr, opts.windowSec, "NX")
        .exec();

      const count = Number(results?.[0]?.[1] ?? 0);

      const remaining = Math.max(0, opts.limit - count);

      res.setHeader("RateLimit-Limit", String(opts.limit));
      res.setHeader("RateLimit-Remaining", String(remaining));

      if (count > opts.limit) {
        res.setHeader("Retry-After", String(opts.windowSec));
        throw new AppError(429, "Too Many Requests");
      }

      next();
    } catch (error) {
      next(error);
      return;
    }
  };
}
