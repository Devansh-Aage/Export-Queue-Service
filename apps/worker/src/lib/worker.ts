import { Worker } from "bullmq";
import { processExportJob } from "../processors/export.js";
import { ExportJobData, queueName } from "@repo/queue";
import redis from "./redis.js";

export function createExportWorker(): Worker<ExportJobData> {
  return new Worker<ExportJobData>(
    queueName,
    async (job) => {
      await processExportJob(job.data.exportId);
    },
    {
      connection: redis,
    },
  );
}
