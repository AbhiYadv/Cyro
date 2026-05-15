import type { ModelRegistryEntry } from "./modelRegistry";
import type { SidecarBinaryStatus } from "./sidecar";

export type RuntimeMode = "fast" | "thinking";
export type RuntimeRoute = "local_mock" | "local_sidecar";
export type RuntimeState = "not_configured" | "sidecar_ready" | "model_valid" | "ready" | "generating" | "error";
export type FinishReason = "completed" | "mock_fallback";
export type BenchmarkStatus = "not_run" | "running" | "passed" | "slow" | "failed" | "blocked";
export type LatencyClass = "fast" | "acceptable" | "slow" | "blocked" | "unknown";

export type RuntimeBenchmarkResult = {
  benchmarkId: string;
  status: BenchmarkStatus;
  modelId: string;
  modelFileName: string | null;
  modelFileSizeMb: number | null;
  route: RuntimeRoute;
  mode: RuntimeMode;
  elapsedMs: number;
  tokensPerSecondOptional: number | null;
  latencyClass: LatencyClass;
  passed: boolean;
  reason: string;
  createdAt: string;
};

export type RuntimeBenchmarkStatus = {
  status: BenchmarkStatus;
  latestResult: RuntimeBenchmarkResult | null;
  message: string;
};

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
  benchmark: RuntimeBenchmarkStatus;
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
