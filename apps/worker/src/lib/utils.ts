import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const getRootDir = () => {
  const rootDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../..",
  );
  return rootDir;
};

export const getDatasetPath = (datasetName: string) => {
  const rootDir = getRootDir();
  const datasetPath = path.join(rootDir, "storage", "dataset", datasetName);
  return datasetPath;
};

export const getOutputPath = (exportId: string) => {
  const rootDir = getRootDir();
  const outputsDir = path.join(rootDir, "outputs");
  mkdirSync(outputsDir, { recursive: true });
  return path.join(outputsDir, `${exportId}.zip`);
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
