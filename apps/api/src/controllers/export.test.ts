import { prisma } from "@repo/prisma";
import { createApp } from "../app.js";
import { loadEnv } from "../env.js";
import { exportQueue } from "../lib/queue.js";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

const env = loadEnv(process.env);
const app = createApp(env);

async function cleanDb() {
  await prisma.export.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dataset.deleteMany();
}

async function cleanQueue() {
  await exportQueue.obliterate({ force: true }).catch(() => undefined);
}

async function seedDataset() {
  return await prisma.dataset.create({
    data: {
      name: "test-dataset",
      path: "test-dataset",
    },
  });
}

async function registerAgent() {
  const agent = request.agent(app);

  const email = `user-${randomUUID()}@example.com`;
  const password = "password123";

  await agent.post("/auth/register").send({ email, password }).expect(204);

  return agent;
}

describe("POST /export/create", () => {
  beforeEach(async () => {
    await cleanDb();
    await cleanQueue();
  });

  afterAll(async () => {
    await cleanDb();
    await cleanQueue();
    await exportQueue.close();
    await prisma.$disconnect();
  });

  it("creates export and enqueues job", async () => {
    const agent = await registerAgent();
    const dataset = await seedDataset();

    const res = await agent
      .post("/export")
      .send({ datasetId: dataset.id })
      .expect(201);

    expect(res.body).toEqual({
      success: true,
      data: {
        message: "Export Request Acknowledged!",
        exportId: expect.any(String),
      },
    });

    const exportId = res.body.data.exportId as string;

    const row = await prisma.export.findUnique({
      where: {
        id: exportId,
      },
    });

    expect(row).toMatchObject({
      id: exportId,
      datasetId: dataset.id,
      status: "PENDING",
    });
    expect(row?.userId).toBeTruthy();

    const job = await exportQueue.getJob(exportId);
    expect(job).toBeTruthy();
    expect(job!.data).toEqual({ exportId });
  });

  it("rejects unauthenticated user", async () => {
    const dataset = await seedDataset();

    const res = await request(app)
      .post("/export")
      .send({ datasetId: dataset.id })
      .expect(401);

    expect(res.body.error).toMatch(/auth token/i);
  });

  it("rejects non-uuid dataset ID", async () => {
    const agent = await registerAgent();
    const res = await agent
      .post("/export")
      .send({ datasetId: "not-a-uuid" })
      .expect(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("rejects unknown dataset", async () => {
    const agent = await registerAgent();

    const res = await agent
      .post("/export")
      .send({ datasetId: randomUUID() })
      .expect(400);

    expect(res.body.error).toBe("Invalid Dataset ID");
  });

  it("rejects duplicate active export", async () => {
    const agent = await registerAgent();
    const dataset = await seedDataset();

    await agent.post("/export").send({ datasetId: dataset.id }).expect(201);

    const res = await agent
      .post("/export")
      .send({ datasetId: dataset.id })
      .expect(400);

    expect(res.body.error).toBe("Export Request already exists!");
  });

  it("allows create export again when previous one failed", async () => {
    const dataset = await seedDataset();
    const agent = await registerAgent();
    await agent.post("/export").send({ datasetId: dataset.id }).expect(201);

    await prisma.export.updateMany({
      where: {
        datasetId: dataset.id,
      },
      data: {
        status: "FAILED",
      },
    });

    await cleanQueue();

    await agent.post("/export").send({ datasetId: dataset.id }).expect(201);

    const count = await prisma.export.count({
      where: { datasetId: dataset.id },
    });
    expect(count).toBe(2);
  });
});
