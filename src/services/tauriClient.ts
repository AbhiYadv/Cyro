import { invoke } from "@tauri-apps/api/core";
import type { HealthCheck, LocalPromptResponse, RuntimeMode, RuntimeStatus } from "../types/runtime";

type CommandArgs = Record<string, unknown>;
export type TauriInvoker = <T>(command: string, args?: CommandArgs) => Promise<T>;

const mockedRuntimeStatus: RuntimeStatus = {
  health: "ok",
  modelLoaded: false,
  modelName: null,
  mode: "fast",
  network: "disabled",
  vault: "not_indexed",
  memory: "local_only",
  sync: "disabled",
  privacy: "offline"
};

export function isPromptValid(prompt: string) {
  return prompt.trim().length > 0;
}

function hasTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function mockInvoke<T>(command: string, args?: CommandArgs): Promise<T> {
  if (command === "health_check") {
    return { health: "ok" } as T;
  }

  if (command === "get_runtime_status") {
    return mockedRuntimeStatus as T;
  }

  if (command === "send_local_prompt") {
    const prompt = String(args?.prompt ?? "");
    const mode = (args?.mode === "thinking" ? "thinking" : "fast") as RuntimeMode;

    if (prompt.trim() === "/fail") {
      throw new Error("Sprint 0 mocked command failure.");
    }

    return {
      response: "Local inference is not connected yet. This is the Sprint 0 mocked response.",
      mode,
      mocked: true
    } as T;
  }

  throw new Error(`Unknown Sprint 0 command: ${command}`);
}

const defaultInvoker: TauriInvoker = async <T>(command: string, args?: CommandArgs) => {
  if (hasTauriRuntime()) {
    return invoke<T>(command, args);
  }

  return mockInvoke<T>(command, args);
};

export async function healthCheck(invoker: TauriInvoker = defaultInvoker) {
  return invoker<HealthCheck>("health_check");
}

export async function getRuntimeStatus(invoker: TauriInvoker = defaultInvoker) {
  return invoker<RuntimeStatus>("get_runtime_status");
}

export async function sendLocalPrompt(prompt: string, mode: RuntimeMode, invoker: TauriInvoker = defaultInvoker) {
  if (!isPromptValid(prompt)) {
    throw new Error("Enter a prompt before sending.");
  }

  return invoker<LocalPromptResponse>("send_local_prompt", {
    prompt: prompt.trim(),
    mode
  });
}
