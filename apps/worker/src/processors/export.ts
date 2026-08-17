import { prisma } from "@repo/prisma";
import { getObjectStream, listDatasetKeys } from "../lib/utils.js";
import { ZipArchive } from "archiver";
import { UnrecoverableError } from "bullmq";
import { loadEnv } from "../env.js";
import { Upload } from "@aws-sdk/lib-storage";
import { s3 } from "../lib/s3Client.js";
import { PassThrough } from "node:stream";

const env = loadEnv();

export const processExportJob = async (exportId: string) => {
  try {
    const exportObj = await prisma.export.findUnique({
      where: {
        id: exportId,
      },
    });
    if (!exportObj) {
      console.error("Invalid export ID: ", exportId);
      throw new UnrecoverableError("No Export Object Found");
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
      throw new UnrecoverableError("Dataset Missing!");
    }

    const prefix = `${env.S3_DATASET_PREFIX}/${dataset.name}/`;
    const keys = await listDatasetKeys(prefix);
    if (keys.length === 0) {
      throw new UnrecoverableError(
        `No objects under s3://${env.S3_BUCKET}/${prefix}`,
      );
    }

    const outputFilename = `${exportId}.zip`;
    const outputKey = `${env.S3_OUTPUT_PREFIX}/${outputFilename}`;

    const archive = new ZipArchive({
      zlib: { level: 9 },
    });
    const body = new PassThrough();
    archive.on("error", (err) => body.destroy(err));
    archive.pipe(body);

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: env.S3_BUCKET,
        Key: outputKey,
        Body: body,
        ContentType: "application/zip",
      },
    });
    const uploadDone = upload.done();

    for (const key of keys) {
      const name = key.slice(prefix.length);
      if (!name) continue;
      const body = await getObjectStream(key);
      archive.append(body, { name });
    }

    await archive.finalize();
    await uploadDone;

    await prisma.export.update({
      where: {
        id: exportId,
      },
      data: {
        status: "COMPLETED",
        path: outputFilename,
      },
    });
    console.log(`Export created: s3://${env.S3_BUCKET}/${outputKey}`);
  } catch (error) {
    console.error(`Error processing job with id:${exportId}`, error);
    throw error;
  }
};
