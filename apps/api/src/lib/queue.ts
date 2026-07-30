import { Queue } from "bullmq";
import { queueName } from "@repo/queue";
import { redis } from "./redis.js";

export const exportQueue = new Queue(queueName, {
  connection: redis,
});
