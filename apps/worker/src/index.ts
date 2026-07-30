import { prisma } from "@repo/prisma";

import { createApp } from "./app.js";
import { loadEnv } from "./env.js";
import { createExportWorker } from "./lib/worker.js";
import redis from "./lib/redis.js";

const SHUTDOWN_TIMEOUT_MS = 5_000;

const env = loadEnv();
const app = createApp(env);

const worker = createExportWorker();
await worker.waitUntilReady();

const server = app.listen(env.WORKER_PORT, env.WORKER_HOST, () => {
  console.log(
    `Worker server listening on http://${env.WORKER_HOST}:${env.WORKER_PORT}`,
  );
});

let shuttingDown = false;

async function shutdown(reason: string, error: unknown): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  console.error(`[fatal] ${reason}`, error);

  const forceExit = setTimeout(() => {
    console.error(
      `[fatal] shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms, forcing exit`,
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
    console.error("[fatal] graceful shutdown complete");
    process.exit(1);
  } catch (shutdownError) {
    console.error("[fatal] error during graceful shutdown", shutdownError);
    process.exit(1);
  }
}

process.on("uncaughtException", (error) => {
  void shutdown("uncaughtException", error);
});

process.on("unhandledRejection", (reason) => {
  void shutdown("unhandledRejection", reason);
});
