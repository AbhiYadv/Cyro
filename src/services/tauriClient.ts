import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { placeholderModelRegistry } from "./modelRegistry";
import { mockedSidecarStatus } from "./sidecar";
import type { ProviderId, ProviderNativeContainerResult, ProviderSessionDescriptor } from "../types/provider";
import type {
  CancelGenerationResponse,
  HealthCheck,
  LocalPromptStreamEvent,
  LocalPromptResponse,
  RuntimeBenchmarkResult,
  RuntimeCommandError,
  RuntimeMode,
  RuntimeBackendMode,
  RuntimeStatus,
  StreamingPromptResult
} from "../types/runtime";

type CommandArgs = Record<string, unknown>;
export type TauriInvoker = <T>(command: string, args?: CommandArgs) => Promise<T>;
export type StreamEventSubscriber = (handler: (event: LocalPromptStreamEvent) => void) => Promise<UnlistenFn>;
export const LOCAL_PROMPT_STREAM_EVENT = "cyro://local-prompt-stream";

const mockedRuntimeStatus: RuntimeStatus = {
  health: "ok",
  modelLoaded: false,
  modelName: null,
  mode: "fast",
  runtimeState: "not_configured",
  activeRoute: "local_mock",
  routeExplanation: "Local Brain is not configured. Cyro will use the local mock fallback.",
  backendMode: "auto",
  cpuFallbackActive: false,
  sidecar: mockedSidecarStatus,
  localModel: placeholderModelRegistry[0],
  modelRegistry: placeholderModelRegistry,
  benchmark: {
    status: "not_run",
    latestResult: null,
    message: "Benchmark has not run. Configure local runtime paths before benchmarking."
  },
  generationState: "idle",
  activeGenerationId: null,
  lastFinishReason: null,
  lastError: null,
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
      modelId: null,
      mode,
      route: "local_mock",
      elapsedMs: 0,
      finishReason: "mock_fallback",
      mocked: true
    } as T;
  }

  if (command === "send_local_prompt_streaming") {
    const prompt = String(args?.prompt ?? "");
    const mode = (args?.mode === "thinking" ? "thinking" : "fast") as RuntimeMode;

    if (prompt.trim() === "/fail") {
      throw new Error("Sprint 0 mocked command failure.");
    }

    return {
      generationId: "mock:fallback",
      finalText: "Local inference is not connected yet. This is the Sprint 0 mocked response.",
      finishReason: "mock_fallback",
      elapsedMs: 0,
      route: "local_mock",
      modelId: null,
      cancelled: false,
      timedOut: false,
      error: null,
      mode
    } as T;
  }

  if (command === "cancel_generation") {
    return {
      generationId: typeof args?.generationId === "string" ? args.generationId : null,
      state: "cancelled",
      cancelled: true,
      message: "Mock local generation cancelled."
    } as T;
  }

  if (command === "run_runtime_benchmark") {
    throw new Error("Runtime benchmark requires the native Tauri app with validated local sidecar and model paths.");
  }

  if (command === "set_runtime_backend_mode") {
    return (args?.mode ?? "auto") as T;
  }

  if (command === "get_provider_session") {
    const providerId = args?.providerId;
    if (providerId === "chatgpt") {
      return mockedProviderSession(
        "chatgpt",
        "ChatGPT",
        "https://chatgpt.com",
        "blocked_blank",
        "Manual review observed a blank or blocked ChatGPT iframe inside the Cyro layout. Iframe embedding is likely unsuitable for ChatGPT final UX."
      ) as T;
    }
    if (providerId === "claude") {
      return mockedProviderSession(
        "claude",
        "Claude",
        "https://claude.ai",
        "not_tested",
        "Claude iframe behavior has not been manually validated in this review. Cyro must not claim embedded Claude session success."
      ) as T;
    }
    if (providerId === "gemini") {
      return mockedProviderSession(
        "gemini",
        "Gemini",
        "https://gemini.google.com",
        "not_tested",
        "Gemini iframe behavior has not been manually validated in this review. Cyro must not claim embedded Gemini session success."
      ) as T;
    }
    throw new Error("This provider route is not allowlisted.");
  }

  if (command === "open_native_provider_container") {
    const providerId = args?.providerId;
    if (providerId === "chatgpt" || providerId === "claude" || providerId === "gemini") {
      throw new Error("Native provider container requires the Tauri app. Browser preview cannot open provider webviews.");
    }
    throw new Error("This provider route is not allowlisted.");
  }

  if (command === "open_in_layout_provider_container") {
    const providerId = args?.providerId;
    if (providerId === "chatgpt" || providerId === "claude" || providerId === "gemini") {
      throw new Error("In-layout native provider container requires the Tauri app. Browser preview cannot open provider webviews.");
    }
    throw new Error("This provider route is not allowlisted.");
  }

  throw new Error(`Unknown Sprint 0 command: ${command}`);
}

function mockedProviderSession(
  providerId: ProviderId,
  displayName: string,
  origin: string,
  feasibilityStatus: ProviderSessionDescriptor["feasibilityStatus"],
  feasibilityResult: string
): ProviderSessionDescriptor {
  return {
    providerId,
    displayName,
    origin,
    surfaceMechanism: "iframe",
    feasibilityStatus,
    feasibilityResult,
    providerOwnedLabel: "Provider-owned origin. Cyro does not read provider DOM, responses, cookies, tokens, or credentials.",
    fallbackAllowed: true,
    blockedMessage: "If this provider refuses to load inside Cyro, use the explicit fallback link. Do not bypass provider protections."
  };
}

const defaultInvoker: TauriInvoker = async <T>(command: string, args?: CommandArgs) => {
  if (hasTauriRuntime()) {
    return invoke<T>(command, args);
  }

  return mockInvoke<T>(command, args);
};

const defaultStreamSubscriber: StreamEventSubscriber = async (handler) => {
  if (hasTauriRuntime()) {
    return listen<LocalPromptStreamEvent>(LOCAL_PROMPT_STREAM_EVENT, (event) => handler(event.payload));
  }

  return () => undefined;
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

export async function sendLocalPromptStreaming(
  prompt: string,
  mode: RuntimeMode,
  onEvent: (event: LocalPromptStreamEvent) => void,
  invoker: TauriInvoker = defaultInvoker,
  subscribeToStream: StreamEventSubscriber = defaultStreamSubscriber
) {
  if (!isPromptValid(prompt)) {
    throw new Error("Enter a prompt before sending.");
  }

  const unlisten = await subscribeToStream(onEvent);
  try {
    return await invoker<StreamingPromptResult>("send_local_prompt_streaming", {
      prompt: prompt.trim(),
      mode,
      modelId: "qwen-0_8b-local",
      maxTokens: 120,
      stream: true
    });
  } finally {
    unlisten();
  }
}

export async function cancelGeneration(generationId?: string | null, invoker: TauriInvoker = defaultInvoker) {
  return invoker<CancelGenerationResponse>("cancel_generation", { generationId: generationId ?? null });
}

export async function runRuntimeBenchmark(mode: RuntimeMode, invoker: TauriInvoker = defaultInvoker) {
  return invoker<RuntimeBenchmarkResult>("run_runtime_benchmark", {
    modelId: "qwen-0_8b-local",
    mode,
    maxTokens: 80,
    timeoutMs: 60_000
  });
}

export async function setRuntimeBackendMode(mode: RuntimeBackendMode, invoker: TauriInvoker = defaultInvoker) {
  return invoker<RuntimeBackendMode>("set_runtime_backend_mode", { mode });
}

export async function getProviderSession(providerId: ProviderId, invoker: TauriInvoker = defaultInvoker) {
  return invoker<ProviderSessionDescriptor>("get_provider_session", { providerId });
}

export async function openNativeProviderContainer(providerId: ProviderId, invoker: TauriInvoker = defaultInvoker) {
  return invoker<ProviderNativeContainerResult>("open_native_provider_container", { providerId });
}

export async function openInLayoutProviderContainer(providerId: ProviderId, invoker: TauriInvoker = defaultInvoker) {
  return invoker<ProviderNativeContainerResult>("open_in_layout_provider_container", { providerId });
}

export function formatRuntimeError(error: unknown, fallback = "The local runtime command failed.") {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const runtimeError = error as RuntimeCommandError;
    if (typeof runtimeError.message === "string") {
      return runtimeError.userAction ? `${runtimeError.message} ${runtimeError.userAction}` : runtimeError.message;
    }
  }

  return fallback;
}
