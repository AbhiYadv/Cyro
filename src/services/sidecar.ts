import { invoke } from "@tauri-apps/api/core";
import type { SidecarBinaryStatus } from "../types/sidecar";

type CommandArgs = Record<string, unknown>;
export type SidecarInvoker = <T>(command: string, args?: CommandArgs) => Promise<T>;

export const mockedSidecarStatus: SidecarBinaryStatus = {
  state: "not_configured",
  binaryKind: null,
  path: null,
  version: null,
  message: "No llama.cpp sidecar binary is configured.",
  recoverable: true,
  userAction: "Configure an allowlisted llama-cli path.",
  lastCheckedAt: null
};

function hasTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function mockInvoke<T>(command: string, args?: CommandArgs): Promise<T> {
  if (command === "get_sidecar_status") {
    return mockedSidecarStatus as T;
  }

  if (command === "validate_sidecar_path") {
    return {
      ...mockedSidecarStatus,
      state: "error",
      path: typeof args?.path === "string" ? args.path : null,
      message: "Sidecar path validation requires the native Tauri runtime.",
      userAction: "Open the desktop app to validate a local llama-cli path."
    } as T;
  }

  if (command === "set_sidecar_path") {
    throw new Error("Sidecar path storage requires the native Tauri runtime.");
  }

  throw new Error(`Unknown sidecar command: ${command}`);
}

const defaultInvoker: SidecarInvoker = async <T>(command: string, args?: CommandArgs) => {
  if (hasTauriRuntime()) {
    return invoke<T>(command, args);
  }

  return mockInvoke<T>(command, args);
};

export async function getSidecarStatus(invoker: SidecarInvoker = defaultInvoker) {
  return invoker<SidecarBinaryStatus>("get_sidecar_status");
}

export async function validateSidecarPath(path: string, invoker: SidecarInvoker = defaultInvoker) {
  return invoker<SidecarBinaryStatus>("validate_sidecar_path", { path });
}

export async function setSidecarPath(path: string, invoker: SidecarInvoker = defaultInvoker) {
  return invoker<SidecarBinaryStatus>("set_sidecar_path", { path });
}
