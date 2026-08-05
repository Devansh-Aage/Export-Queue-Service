import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client.js";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

config({ path: path.join(rootDir, ".env") });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  const datasetRoot = path.join(rootDir, "storage", "dataset");
  const entries = await readdir(datasetRoot, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (directories.length === 0) {
    console.log(`No datasets found under ${datasetRoot}`);
    return;
  }

  const existing = await prisma.dataset.findMany({
    where: { path: { in: directories } },
    select: { id: true, path: true },
  });

  const existingByPath = new Map(existing.map((d) => [d.path, d]));
  const toCreate = directories.filter((name) => !existingByPath.has(name));

  if (toCreate.length > 0) {
    await prisma.dataset.createMany({
      data: toCreate.map((name) => ({ name, path: name })),
    });
    console.log("Created Datasets!");
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
