import { prisma } from "@repo/prisma";

import { createApp } from "./app.js";
import { loadEnv } from "./env.js";
import { createExportWorker } from "./lib/worker.js";
import { jobDurationMs, workerMetrics } from "./lib/metrics.js";
import redis from "./lib/redis.js";
import { getProcessorPath } from "./lib/utils.js";
import { handleJobFailed } from "./lib/jobEventHandler.js";

const SHUTDOWN_TIMEOUT_MS = 5_000;

const env = loadEnv();
const processorFile = getProcessorPath();
const worker = createExportWorker(env);
workerMetrics.setMaxConcurrency(env.WORKER_CONCURRENCY);
await worker.waitUntilReady();

const app = createApp(env, worker);

const server = app.listen(env.WORKER_PORT, env.WORKER_HOST, () => {
  console.log(
    `Worker server listening on http://${env.WORKER_HOST}:${env.WORKER_PORT}`,
  );
});

worker.on("active", () => {
  workerMetrics.jobStarted();
});

worker.on("completed", (job) => {
  workerMetrics.recordJob("completed", jobDurationMs(job), job.attemptsMade);

  console.log({
    event: "job completed",
    jobId: job?.id,
    exportId: job.data.exportId,
    durationMs: jobDurationMs(job),
  });
});

worker.on("failed", (job, err) =>
  handleJobFailed(job, err, { prisma, metrics: workerMetrics }),
);

worker.on("error", (err) => console.error({ event: "worker.error", err }));
worker.on("stalled", (jobId) => console.warn({ event: "job.stalled", jobId }));

let shuttingDown = false;

async function shutdown(
  reason: string,
  error?: unknown,
  exitCode = 1,
): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  if (error !== undefined) {
    console.error(`[shutdown] ${reason}`, error);
  } else {
    console.log(`[shutdown] ${reason}`);
  }

  const forceExit = setTimeout(() => {
    console.error(
      `[shutdown] timed out after ${SHUTDOWN_TIMEOUT_MS}ms, forcing exit`,
    );
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
    await worker.close();
    await redis.quit();
    await prisma.$disconnect();
    console.log("[shutdown] graceful shutdown complete");
    process.exit(exitCode);
  } catch (shutdownError) {
    console.error("[shutdown] error during graceful shutdown", shutdownError);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT", undefined, 0);
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM", undefined, 0);
});

process.on("uncaughtException", (error) => {
  void shutdown("uncaughtException", error);
});

process.on("unhandledRejection", (reason) => {
  void shutdown("unhandledRejection", reason);
});
