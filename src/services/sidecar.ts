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
  userAction: "Configure an allowlisted llama-cli path in a future sidecar validation task."
};

function hasTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function mockInvoke<T>(command: string): Promise<T> {
  if (command === "get_sidecar_status") {
    return mockedSidecarStatus as T;
  }

  throw new Error(`Unknown sidecar command: ${command}`);
}

const defaultInvoker: SidecarInvoker = async <T>(command: string, args?: CommandArgs) => {
  if (hasTauriRuntime()) {
    return invoke<T>(command, args);
  }

  return mockInvoke<T>(command);
};

export async function getSidecarStatus(invoker: SidecarInvoker = defaultInvoker) {
  return invoker<SidecarBinaryStatus>("get_sidecar_status");
}
