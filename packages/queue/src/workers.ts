import {
  Worker,
  type ConnectionOptions,
  type Processor,
  type WorkerOptions,
} from "bullmq";

import { createRedisConnection } from "./connection.js";
import {
  QUEUE_NAMES,
  type ExportJobData,
  type ExportJobResult,
} from "./jobs.js";

export type CreateWorkerOptions = Omit<WorkerOptions, "connection"> & {
  connection?: ConnectionOptions;
  redisUrl?: string;
};

function resolveConnection(
  options: CreateWorkerOptions = {},
): ConnectionOptions {
  if (options.connection) {
    return options.connection;
  }

  return createRedisConnection({ url: options.redisUrl });
}

export function createExportWorker(
  processor: Processor<ExportJobData, ExportJobResult>,
  options: CreateWorkerOptions = {},
): Worker<ExportJobData, ExportJobResult> {
  const { connection, redisUrl, ...workerOptions } = options;

  return new Worker<ExportJobData, ExportJobResult>(
    QUEUE_NAMES.EXPORT,
    processor,
    {
      connection: resolveConnection({ connection, redisUrl }),
      concurrency: 2,
      ...workerOptions,
    },
  );
}
