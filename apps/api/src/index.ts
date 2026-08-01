import { prisma } from "@repo/prisma";

import { createApp } from "./app.js";
import { loadEnv } from "./env.js";
import { redis } from "./lib/redis.js";

const SHUTDOWN_TIMEOUT_MS = 5_000;

const env = loadEnv();
const app = createApp(env);

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`Check health on http://${env.HOST}:${env.PORT}/health`);
});

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

    await redis.quit();
    await prisma.$disconnect();
    console.error("[shutdown] graceful shutdown complete");
    process.exit(exitCode);
  } catch (shutdownError) {
    console.error("[shutdown] error during graceful shutdown", shutdownError);
    process.exit(1);
  }
}

process.on("uncaughtException", (error) => {
  void shutdown("uncaughtException", error);
});

process.on("unhandledRejection", (reason) => {
  void shutdown("unhandledRejection", reason);
});
