import type { ModelRegistryEntry } from "./modelRegistry";
import type { SidecarBinaryStatus } from "./sidecar";

export type RuntimeMode = "fast" | "thinking";
export type RuntimeRoute = "local_mock" | "local_sidecar";
export type RuntimeState = "not_configured" | "sidecar_ready" | "model_valid" | "ready" | "generating" | "error";
export type FinishReason = "completed" | "mock_fallback";

export type RuntimeStatus = {
  health: "ok";
  modelLoaded: boolean;
  modelName: string | null;
  mode: RuntimeMode;
  runtimeState: RuntimeState;
  activeRoute: RuntimeRoute;
  routeExplanation: string;
  sidecar: SidecarBinaryStatus;
  localModel: ModelRegistryEntry | null;
  modelRegistry: ModelRegistryEntry[];
  lastError: RuntimeCommandError | null;
  network: "disabled";
  vault: "not_indexed";
  memory: "local_only";
  sync: "disabled";
  privacy: "offline";
};

export type HealthCheck = {
  health: "ok";
};

export type LocalPromptResponse = {
  response: string;
  modelId: string | null;
  mode: RuntimeMode;
  route: RuntimeRoute;
  elapsedMs: number;
  finishReason: FinishReason;
  mocked: boolean;
};

export type RuntimeCommandError = {
  code?: string;
  message?: string;
  recoverable?: boolean;
  userAction?: string;
  debugDetailSafe?: string | null;
};
