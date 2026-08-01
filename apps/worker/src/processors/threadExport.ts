import { ExportJobData } from "@repo/queue";
import type { SandboxedJob } from "bullmq";
import { processExportJob } from "./export.js";

export default async (job: SandboxedJob<ExportJobData>) => {
  const { exportId } = job.data;
  await processExportJob(exportId);
};
