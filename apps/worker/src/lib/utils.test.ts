import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  getRootDir,
  getDatasetPath,
  getOutputPath,
  getProcessorPath,
} from "./utils.js";

describe("path helpers", () => {
  it("getRootDir returns an absolute path", () => {
    expect(path.isAbsolute(getRootDir())).toBe(true);
  });

  it("getDatasetPath joins storage/dataset/<name>", () => {
    expect(getDatasetPath("orders")).toBe(
      path.join(getRootDir(), "storage", "dataset", "orders"),
    );
  });

  it("getOutputPath joins outputs/<id>.zip", () => {
    expect(getOutputPath("exp-123")).toBe(
      path.join(getRootDir(), "outputs", "exp-123.zip"),
    );
  });

  it("getProcessorPath points at dist threadExport.js", () => {
    expect(getProcessorPath()).toBe(
      path.join(
        getRootDir(),
        "apps",
        "worker",
        "dist",
        "processors",
        "threadExport.js",
      ),
    );
  });
});
