import { z } from "zod";

export const QUEUE_NAMES = {
  EXPORT: "export",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const exportJobDataSchema = z.object({
  exportJobId: z.string().min(1),
  datasetId: z.string().min(1),
  format: z.enum(["json", "csv", "zip"]).default("json"),
});

export type ExportJobData = z.infer<typeof exportJobDataSchema>;

export const exportJobResultSchema = z.object({
  exportJobId: z.string(),
  outputPath: z.string(),
});

export type ExportJobResult = z.infer<typeof exportJobResultSchema>;
