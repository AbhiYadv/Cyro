import { invoke } from "@tauri-apps/api/core";
import type { ModelPathValidationResult, ModelRegistryEntry } from "../types/modelRegistry";

type CommandArgs = Record<string, unknown>;
export type ModelRegistryInvoker = <T>(command: string, args?: CommandArgs) => Promise<T>;

export const placeholderModelRegistry: ModelRegistryEntry[] = [
  {
    modelId: "qwen-0_8b-local",
    displayName: "Qwen 0.8B Local",
    family: "qwen",
    parameterClass: "0.8B",
    quantization: "unknown_until_path_validated",
    filePath: null,
    fileName: null,
    contextWindow: 4096,
    installed: false,
    validated: false,
    fileSizeMb: null,
    minRamMb: 2048,
    recommendedRamMb: 4096,
    lastValidatedAt: null
  }
];

function hasTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function mockInvoke<T>(command: string, args?: CommandArgs): Promise<T> {
  if (command === "get_model_registry") {
    return placeholderModelRegistry as T;
  }

  if (command === "validate_model_path") {
    return {
      valid: false,
      state: "error",
      path: typeof args?.path === "string" ? args.path : null,
      fileName: null,
      extension: null,
      fileSizeMb: null,
      readable: false,
      isFile: false,
      message: "Model path validation requires the native Tauri runtime.",
      recoverable: true,
      userAction: "Open the desktop app to validate a local GGUF model path."
    } as T;
  }

  if (command === "set_model_path") {
    throw new Error("Model path storage requires the native Tauri runtime.");
  }

  throw new Error(`Unknown model registry command: ${command}`);
}

const defaultInvoker: ModelRegistryInvoker = async <T>(command: string, args?: CommandArgs) => {
  if (hasTauriRuntime()) {
    return invoke<T>(command, args);
  }

  return mockInvoke<T>(command, args);
};

export async function validateModelPath(path: string, invoker: ModelRegistryInvoker = defaultInvoker) {
  return invoker<ModelPathValidationResult>("validate_model_path", { path });
}

export async function getModelRegistry(invoker: ModelRegistryInvoker = defaultInvoker) {
  return invoker<ModelRegistryEntry[]>("get_model_registry");
}

export async function setModelPath(modelId: string, path: string, invoker: ModelRegistryInvoker = defaultInvoker) {
  return invoker<ModelRegistryEntry>("set_model_path", { modelId, path });
}
