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

    exportQueue.add(
      jobName,
      { exportId },
      {
        jobId: exportId,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    );

    sendSuccess(res, { message: "Export Request Acknowledged!" }, 201);
  } catch (error) {
    next(error);
  }
}

const STUCK_PROCESSING_HINT =
  "PROCESSING rows with no matching active BullMQ job";

export async function getMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "Unauthorized");
    }

    const [counts, waitingJobs, activeJobs, statusGroups] = await Promise.all([
      exportQueue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "paused",
      ),
      exportQueue.getJobs(["waiting"], 0, 0),
      exportQueue.getJobs(["active"]),
      prisma.export.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const oldestWaiting = waitingJobs[0];
    const oldestWaitingAgeMs = oldestWaiting?.timestamp
      ? Math.max(0, Date.now() - oldestWaiting.timestamp)
      : null;

    const activeIds = new Set(
      activeJobs.map((job) => job.id).filter((id): id is string => Boolean(id)),
    );

    const processingExports = await prisma.export.findMany({
      where: { status: "PROCESSING" },
      select: { id: true },
    });

    const stuckProcessingIds = processingExports
      .map((row) => row.id)
      .filter((id) => !activeIds.has(id));

    const statusCounts = Object.fromEntries(
      statusGroups.map((row) => [row.status, row._count._all]),
    ) as Record<string, number>;

    const terminalCompleted = statusCounts.COMPLETED ?? 0;
    const terminalFailed = statusCounts.FAILED ?? 0;
    const terminalTotal = terminalCompleted + terminalFailed;

    sendSuccess(
      res,
      {
        service: "api",
        queue: {
          counts,
          oldestWaitingAgeMs,
          activeCount: activeIds.size,
        },
        exports: {
          statusCounts,
          successRate:
            terminalTotal === 0
              ? null
              : Math.round((terminalCompleted / terminalTotal) * 10_000) /
                10_000,
          stuckProcessing: {
            count: stuckProcessingIds.length,
            ids: stuckProcessingIds.slice(0, 50),
            hint: STUCK_PROCESSING_HINT,
          },
        },
        collectedAt: new Date().toISOString(),
      },
      200,
    );
  } catch (error) {
    next(error);
  }
}
