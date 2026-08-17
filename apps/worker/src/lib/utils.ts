import path from "node:path";
import { fileURLToPath } from "node:url";
import { s3 } from "./s3Client.js";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { loadEnv } from "../env.js";
import { Readable } from "node:stream";

const env = loadEnv();

export const getRootDir = () => {
  const rootDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../..",
  );
  return rootDir;
};

export const getProcessorPath = () => {
  const rootDir = getRootDir();
  const processorPath = path.join(
    rootDir,
    "apps",
    "worker",
    "dist",
    "processors",
    "threadExport.js",
  );
  return processorPath;
};

export async function listDatasetKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];

  let continuationToken: string | undefined;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: env.S3_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const obj of page.Contents ?? []) {
      if (obj.Key && !obj.Key.endsWith("/")) {
        keys.push(obj.Key);
      }
    }

    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

export async function getObjectStream(key: string): Promise<Readable> {
  const { Body } = await s3.send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
  );

  if (!(Body instanceof Readable)) {
    throw new Error(`S3 GetObject did not return a stream for ${key}`);
  }
  return Body;
}
