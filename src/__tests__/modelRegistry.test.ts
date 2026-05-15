import { describe, expect, it } from "vitest";
import {
  getModelRegistry,
  placeholderModelRegistry,
  setModelPath,
  validateModelPath,
  type ModelRegistryInvoker
} from "../services/modelRegistry";
import type { ModelPathValidationResult, ModelRegistryEntry } from "../types/modelRegistry";

describe("model registry Tauri contract", () => {
  it("returns the placeholder Qwen registry without filesystem access in browser tests", async () => {
    await expect(getModelRegistry()).resolves.toEqual(placeholderModelRegistry);
    expect(placeholderModelRegistry[0]).toMatchObject({
      modelId: "qwen-0_8b-local",
      installed: false,
      validated: false
    });
  });

  it("passes model path validation through the Rust command boundary", async () => {
    const invocations: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const expected: ModelPathValidationResult = {
      valid: true,
      state: "valid_gguf",
      path: "/tmp/qwen.gguf",
      fileName: "qwen.gguf",
      extension: "gguf",
      fileSizeMb: 1,
      readable: true,
      isFile: true,
      message: "ok",
      recoverable: true,
      userAction: "none"
    };
    const invoker: ModelRegistryInvoker = async <T>(command: string, args?: Record<string, unknown>) => {
      invocations.push({ command, args });
      return expected as T;
    };

    const result = await validateModelPath("/tmp/qwen.gguf", invoker);

    expect(result).toEqual(expected);
    expect(invocations).toEqual([{ command: "validate_model_path", args: { path: "/tmp/qwen.gguf" } }]);
  });

  it("passes model path setting through the Rust registry command", async () => {
    const invocations: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const expected: ModelRegistryEntry = {
      ...placeholderModelRegistry[0],
      filePath: "/tmp/qwen.gguf",
      fileName: "qwen.gguf",
      installed: true,
      validated: true,
      fileSizeMb: 1,
      lastValidatedAt: "unix:1"
    };
    const invoker: ModelRegistryInvoker = async <T>(command: string, args?: Record<string, unknown>) => {
      invocations.push({ command, args });
      return expected as T;
    };

    const result = await setModelPath("qwen-0_8b-local", "/tmp/qwen.gguf", invoker);

    expect(result).toEqual(expected);
    expect(invocations).toEqual([
      {
        command: "set_model_path",
        args: { modelId: "qwen-0_8b-local", path: "/tmp/qwen.gguf" }
      }
    ]);
  });

  it("does not validate filesystem paths in the browser fallback", async () => {
    const result = await validateModelPath("/tmp/qwen.gguf");

    expect(result).toMatchObject({
      valid: false,
      state: "error",
      message: "Model path validation requires the native Tauri runtime."
    });
  });
});
