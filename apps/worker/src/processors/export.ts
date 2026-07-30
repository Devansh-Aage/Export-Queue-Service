import { prisma } from "@repo/prisma";
import { getDatasetPath, getOutputPath } from "../lib/utils.js";
import { ZipArchive } from "archiver";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

export const processExportJob = async (exportId: string) => {
  try {
    const exportObj = await prisma.export.findUnique({
      where: {
        id: exportId,
      },
    });
    if (!exportObj) {
      console.error("Invalid export ID: ", exportId);
      throw Error("No Export Object Found");
    }

    await prisma.export.update({
      where: {
        id: exportId,
      },
      data: {
        status: "PROCESSING",
      },
    });
    const dataset = await prisma.dataset.findUnique({
      where: {
        id: exportObj.datasetId,
      },
    });
    if (!dataset) {
      console.error("Dataset Missing!");
      throw Error("Dataset Missing!");
    }
    const datasetPath = getDatasetPath(dataset.name);

    const archive = new ZipArchive({
      zlib: { level: 9 },
    });

    const outputPath = getOutputPath(exportId);
    const output = createWriteStream(outputPath);

    archive.directory(datasetPath, false);

    await Promise.all([
      pipeline(archive, output), //consumer
      archive.finalize(), //producer: puts files in the consumer which is pipe
    ]);

    await prisma.export.update({
      where: {
        id: exportId,
      },
      data: {
        status: "COMPLETED",
        path: outputPath,
      },
    });
    console.log(`Export created: ${outputPath}`);
  } catch (error) {
    console.error(`Error processing job with id:${exportId}`, error);
    throw error;
  }
};
