import { Worker } from "bullmq";
import { processExportJob } from "../processors/export.js";
import { ExportJobData, queueName } from "@repo/queue";
import redis from "./redis.js";
import { Env } from "../env.js";

export function createExportWorker(
  env: Env,
  processorFile?: string,
): Worker<ExportJobData> {
  void processorFile;
  return new Worker<ExportJobData>(
    queueName,
    async (job) => {
      await processExportJob(job.data.exportId);
    },
    {
      // useWorkerThreads: true,
      connection: redis,
      concurrency: env.WORKER_CONCURRENCY,
      //can pickup atmost 3 jobs per second
      limiter: {
        max: 3,
        duration: 1000,
      },
    },
  );
}
