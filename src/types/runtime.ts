import type { ModelRegistryEntry } from "./modelRegistry";
import type { SidecarBinaryStatus } from "./sidecar";

export type RuntimeMode = "fast" | "thinking";
export type RuntimeBackendMode = "auto" | "cpu";
export type RuntimeRoute = "local_mock" | "local_sidecar";
export type RuntimeState = "not_configured" | "sidecar_ready" | "model_valid" | "ready" | "generating" | "error";
export type FinishReason = "completed" | "mock_fallback" | "cancelled" | "timed_out" | "error";
export type GenerationState = "idle" | "starting" | "streaming" | "cancelling" | "cancelled" | "completed" | "timed_out" | "failed";
export type StreamEventType = "started" | "delta" | "completed" | "cancelled" | "timeout" | "error";
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
  backendMode: RuntimeBackendMode;
  cpuFallbackActive: boolean;
  sidecar: SidecarBinaryStatus;
  localModel: ModelRegistryEntry | null;
  modelRegistry: ModelRegistryEntry[];
  benchmark: RuntimeBenchmarkStatus;
  generationState: GenerationState;
  activeGenerationId: string | null;
  lastFinishReason: FinishReason | null;
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

export type LocalPromptStreamEvent = {
  generationId: string;
  eventType: StreamEventType;
  delta: string | null;
  elapsedMs: number;
  modelId: string | null;
  route: RuntimeRoute;
  sequence: number;
  finishReason: FinishReason | null;
  error: RuntimeCommandError | null;
};

export type StreamingPromptResult = {
  generationId: string;
  finalText: string;
  finishReason: FinishReason;
  elapsedMs: number;
  route: RuntimeRoute;
  modelId: string | null;
  cancelled: boolean;
  timedOut: boolean;
  error: RuntimeCommandError | null;
};

export type CancelGenerationResponse = {
  generationId: string | null;
  state: GenerationState;
  cancelled: boolean;
  message: string;
};

export type RuntimeCommandError = {
  code?: string;
  message?: string;
  recoverable?: boolean;
  userAction?: string;
  debugDetailSafe?: string | null;
};
