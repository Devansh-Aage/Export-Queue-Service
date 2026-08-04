import { ExportJobData } from "@repo/queue";
import { Job } from "bullmq";
import { jobDurationMs, workerMetrics } from "./metrics.js";
import { prisma } from "@repo/prisma";

export async function handleJobFailed(
  job: Job<ExportJobData> | undefined,
  err: Error,
  deps: {
    prisma: typeof prisma;
    metrics: {
      recordJob: typeof workerMetrics.recordJob;
      jobFinished: typeof workerMetrics.jobFinished;
    };
  },
): Promise<void> {
  const attempts = job?.opts.attempts ?? 1;
  const isFinal = (job?.attemptsMade ?? 0) >= attempts;

  // Always release concurrency slot; only count final failures in success rate
  if (job) {
    if (isFinal) {
      deps.metrics.recordJob("failed", jobDurationMs(job), job.attemptsMade);
    } else {
      deps.metrics.jobFinished();
    }
  }

  console.error({
    event: "job failed",
    jobId: job?.id,
    exportId: job?.data.exportId,
    attemptsMade: job?.attemptsMade,
    isFinal,
    err: err.message,
  });

  if (isFinal && job?.data.exportId) {
    await deps.prisma.export.update({
      where: {
        id: job.data.exportId,
      },
      data: {
        status: "FAILED",
      },
    });
  }
}
