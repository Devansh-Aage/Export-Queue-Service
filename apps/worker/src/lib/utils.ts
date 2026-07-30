import path from "node:path";
import { fileURLToPath } from "node:url";

export const getDatasetPath = (datasetName: string) => {
  const rootDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../..",
  );
  const datasetPath = path.join(rootDir, "storage", "dataset", datasetName);
  return datasetPath;
};

export const getOutputPath = (exportId: string) => {
  const rootDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../..",
  );
  const outputPath = path.join(rootDir, "outputs", `${exportId}.zip`);

  return outputPath;
};
