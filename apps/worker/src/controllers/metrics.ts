import type { NextFunction, Request, Response } from "express";
import type { Worker } from "bullmq";

import type { ExportJobData } from "@repo/queue";
import { sendSuccess } from "../lib/response.js";
import { workerMetrics } from "../lib/metrics.js";

export function createGetMetrics(
  worker: Worker<ExportJobData>,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const snapshot = await workerMetrics.snapshot();

      sendSuccess(res, {
        service: "worker",
        running: worker.isRunning(),
        ...snapshot,
      });
    } catch (error) {
      next(error);
    }
  };
}
