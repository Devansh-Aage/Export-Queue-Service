import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { prisma } from "@repo/prisma";

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000";
const POLL_MS = 200;
const TIMEOUT_MS = 190_000;

async function waitForExportCompleted(
  agent: ReturnType<typeof request.agent>,
  exportId: string,
) {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await agent.get(`/export/${exportId}`).expect(200);
    const exp = res.body.data.export;
    if (exp.status === "COMPLETED") {
      return exp as {
        id: string;
        status: string;
        path: string;
      };
    }
    if (exp.status === "FAILED") {
      throw new Error(`Export ${exportId} failed before completing`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error(`Timed out waiting for export ${exportId} to COMPLETE`);
}

describe("e2e: export happy path", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(
    "registers, creates export, worker completes, zip exists",
    async () => {
      await request(API_URL).get("/health").expect(200);

      const agent = request.agent(API_URL);
      const email = `e2e-${randomUUID()}@example.com`;
      const password = "password123";

      await agent.post("/auth/register").send({ email, password }).expect(204);

      const dataset = await prisma.dataset.findFirst();
      expect(dataset).toBeTruthy();

      const createRes = await agent
        .post("/export")
        .send({ datasetId: dataset!.id })
        .expect(201);

      const exportId = createRes.body.data.exportId as string;
      expect(exportId).toBeTruthy();

      const completed = await waitForExportCompleted(agent, exportId);

      expect(completed.status).toBe("COMPLETED");
      expect(completed.path).toBe(`${exportId}.zip`);

      
    },
    TIMEOUT_MS + 15_000,
  );
});
