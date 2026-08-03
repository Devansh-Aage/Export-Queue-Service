import type { NextFunction, Request, Response } from "express";
import { AppError } from "./error.js";

export function requestTimeout(ms: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        next(new AppError(408, "Request Timed Out!"));
      }
    }, ms);

    const clear = () => clearTimeout(timer);
    res.on("finish", clear);
    res.on("close", clear);

    next();
  };
}
