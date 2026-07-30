import { prisma } from "@repo/prisma";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { AppError } from "../middleware/error.js";
import { exportQueue } from "../lib/queue.js";
import { jobName } from "@repo/queue";
import { sendSuccess } from "../lib/response.js";

export const createExportBodySchema = z.object({
  datasetId: z.string().uuid(),
});

export type CreateExportBody = z.infer<typeof createExportBodySchema>;

export async function createExport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "Unauthorized");
    }

    const { datasetId } = req.body as CreateExportBody;

    const exportObj = await prisma.export.create({
      data: {
        datasetId,
        userId: req.user.id,
      },
    });
    const exportId = exportObj.id;

    exportQueue.add(jobName, { exportId }, { jobId: exportId });

    sendSuccess(res, { message: "Export Request Acknowledged!" }, 201);
  } catch (error) {
    next(error);
  }
}

export async function getMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "Unauthorized");
    }
    const counts = await exportQueue.getJobCounts();
    sendSuccess(res, { counts }, 200);
  } catch (error) {
    next(error);
  }
}
