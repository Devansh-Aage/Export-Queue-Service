import { prisma } from "@repo/prisma";
import { createExportWorker } from "@repo/queue";

import { loadEnv } from "./env.js";
import { processExportJob } from "./processors/export.js";

const env = loadEnv();

const worker = createExportWorker(processExportJob, {
  redisUrl: env.REDIS_URL,
  concurrency: env.WORKER_CONCURRENCY,
});

worker.on("ready", () => {
  console.log(`Worker ready (concurrency=${env.WORKER_CONCURRENCY})`);
});

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", async (job, error) => {
  console.error(`Job ${job?.id ?? "unknown"} failed:`, error.message);

});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down worker...`);
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
