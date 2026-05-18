import type { ProviderRouteId } from "../types/provider";

export type ProviderShellReasoningMode = "fast" | "think" | "pro";
export type ProviderShellGenerationState = "idle" | "starting" | "streaming" | "cancelling" | "cancelled" | "completed" | "failed";
export type ProviderSurfaceStatus = "ready" | "blocked" | "unvalidated" | "fallback";

export type ProviderShellState = {
  selectedProvider: ProviderRouteId;
  reasoningMode: ProviderShellReasoningMode;
  drawerOpen: boolean;
  toolsOpen: boolean;
  generationState: ProviderShellGenerationState;
  providerSurfaceStatus: ProviderSurfaceStatus;
  diagnosticsOpen: boolean;
};

export type ProviderShellAction =
  | { type: "select_provider"; provider: ProviderRouteId }
  | { type: "select_reasoning"; reasoningMode: ProviderShellReasoningMode }
  | { type: "toggle_drawer" }
  | { type: "close_drawer" }
  | { type: "toggle_tools" }
  | { type: "close_tools" }
  | { type: "set_generation_state"; generationState: ProviderShellGenerationState }
  | { type: "toggle_diagnostics" };

export type ShellTool = {
  id: "attach" | "vault" | "memory" | "image" | "provider_import" | "settings";
  label: string;
  description: string;
};

export const shellTools: ShellTool[] = [
  { id: "attach", label: "Attach file", description: "Stage a local file for a future Cyro-owned prompt." },
  { id: "vault", label: "Use Vault", description: "Placeholder for a user-approved vault slice." },
  { id: "memory", label: "Use Memory", description: "Placeholder for approved memory context." },
  { id: "image", label: "Create image", description: "Placeholder only. No provider image API is connected." },
  { id: "provider_import", label: "Import provider answer", description: "Placeholder for a future explicit import action." },
  { id: "settings", label: "Settings", description: "Placeholder for provider shell preferences." }
];

export const defaultProviderShellState: ProviderShellState = {
  selectedProvider: "local",
  reasoningMode: "fast",
  drawerOpen: false,
  toolsOpen: false,
  generationState: "idle",
  providerSurfaceStatus: "ready",
  diagnosticsOpen: false
};

export function providerDisplayName(provider: ProviderRouteId) {
  const labels: Record<ProviderRouteId, string> = {
    local: "Local",
    chatgpt: "ChatGPT",
    claude: "Claude",
    gemini: "Gemini"
  };

  return labels[provider];
}

export function shellComposerPlaceholder(provider: ProviderRouteId) {
  return `Ask ${providerDisplayName(provider)}`;
}

export function providerSurfaceStatusForRoute(provider: ProviderRouteId): ProviderSurfaceStatus {
  if (provider === "local") {
    return "ready";
  }

  if (provider === "chatgpt") {
    return "blocked";
  }

  return "unvalidated";
}

export function generationControlForState(generationState: ProviderShellGenerationState) {
  if (generationState === "starting" || generationState === "streaming" || generationState === "cancelling") {
    return { label: "Stop", intent: "stop" as const };
  }

  return { label: "Send", intent: "send" as const };
}

export function runtimeDiagnosticsMode(open: boolean) {
  return open ? "expanded" : "compact";
}

export function providerShellReducer(state: ProviderShellState, action: ProviderShellAction): ProviderShellState {
  switch (action.type) {
    case "select_provider":
      return {
        ...state,
        selectedProvider: action.provider,
        providerSurfaceStatus: providerSurfaceStatusForRoute(action.provider),
        toolsOpen: false
      };
    case "select_reasoning":
      return { ...state, reasoningMode: action.reasoningMode };
    case "toggle_drawer":
      return { ...state, drawerOpen: !state.drawerOpen };
    case "close_drawer":
      return { ...state, drawerOpen: false };
    case "toggle_tools":
      return { ...state, toolsOpen: !state.toolsOpen };
    case "close_tools":
      return { ...state, toolsOpen: false };
    case "set_generation_state":
      return { ...state, generationState: action.generationState };
    case "toggle_diagnostics":
      return { ...state, diagnosticsOpen: !state.diagnosticsOpen };
    default:
      return state;
  }
}
