import { S3Client } from "@aws-sdk/client-s3";
import { loadEnv } from "../env.js";

const env = loadEnv();

export const s3 = new S3Client({ region: env.AWS_REGION });
