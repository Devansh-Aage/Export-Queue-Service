import { Queue, type ConnectionOptions, type DefaultJobOptions } from "bullmq";

import { createRedisConnection } from "./connection.js";
import { QUEUE_NAMES, type ExportJobData } from "./jobs.js";

const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 200,
};

export type CreateQueueOptions = {
  connection?: ConnectionOptions;
  redisUrl?: string;
};

function resolveConnection(
  options: CreateQueueOptions = {},
): ConnectionOptions {
  if (options.connection) {
    return options.connection;
  }

  return createRedisConnection({ url: options.redisUrl });
}

export function createExportQueue(
  options: CreateQueueOptions = {},
): Queue<ExportJobData> {
  return new Queue<ExportJobData>(QUEUE_NAMES.EXPORT, {
    connection: resolveConnection(options),
    defaultJobOptions,
  });
}
