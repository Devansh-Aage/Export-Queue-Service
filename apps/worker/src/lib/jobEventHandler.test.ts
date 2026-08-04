import { prisma } from "@repo/prisma";
import { ExportJobData } from "@repo/queue";
import { Job } from "bullmq";
import { randomUUID } from "crypto";
import { vi, describe, afterAll, beforeEach, it, expect } from "vitest";
import { handleJobFailed } from "./jobEventHandler.js";
function fakeJob(overrides: {
  exportId?: string;
  attemptsMade: number;
  attempts: number;
}): Job<ExportJobData> {
  return {
    id: randomUUID(),
    data: { exportId: overrides.exportId ?? randomUUID() },
    attemptsMade: overrides.attemptsMade,
    opts: { attempts: overrides.attempts },
    processedOn: Date.now() - 100,
    finishedOn: Date.now(),
  } as Job<ExportJobData>;
}

function mockMetrics() {
  return {
    recordJob: vi.fn(),
    jobFinished: vi.fn(),
  };
}

async function cleanDb() {
  await prisma.export.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dataset.deleteMany();
}

async function seedExport(status: "PENDING" | "PROCESSING" = "PROCESSING") {
  const user = await prisma.user.create({
    data: {
      email: `w-${randomUUID()}@example.com`,
      password: "hash",
    },
  });
  const dataset = await prisma.dataset.create({
    data: { name: "ds", path: "ds" },
  });
  const exp = await prisma.export.create({
    data: {
      userId: user.id,
      datasetId: dataset.id,
      status,
    },
  });
  return exp;
}

describe("handleJobFailed", () => {
  beforeEach(async () => {
    await cleanDb();
  });
  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  it("marks export FAILED on final attempt", async () => {
    const exp = await seedExport("PROCESSING");
    const metrics = mockMetrics();
    const job = fakeJob({
      exportId: exp.id,
      attemptsMade: 3,
      attempts: 3,
    });

    await handleJobFailed(job, new Error("boom"), {
      prisma,
      metrics: metrics,
    });

    const updated = await prisma.export.findUnique({ where: { id: exp.id } });
    expect(updated?.status).toBe("FAILED");
    expect(metrics.recordJob).toHaveBeenCalledOnce();
    expect(metrics.jobFinished).not.toHaveBeenCalled();
  });

  it("does not mark FAILED on intermediate attempt", async () => {
    const exp = await seedExport("PROCESSING");
    const metrics = mockMetrics();
    const job = fakeJob({
      exportId: exp.id,
      attemptsMade: 1,
      attempts: 3,
    });

    await handleJobFailed(job, new Error("temp"), {
      prisma,
      metrics: metrics as any,
    });

    const updated = await prisma.export.findUnique({ where: { id: exp.id } });
    expect(updated?.status).toBe("PROCESSING");
    expect(metrics.jobFinished).toHaveBeenCalledOnce();
    expect(metrics.recordJob).not.toHaveBeenCalled();
  });
});
