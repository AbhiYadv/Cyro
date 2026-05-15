export type RuntimeMode = "fast" | "thinking";
export type RuntimeRoute = "local_mock" | "local_sidecar";
export type FinishReason = "completed" | "mock_fallback";

export type RuntimeStatus = {
  health: "ok";
  modelLoaded: false;
  modelName: string | null;
  mode: RuntimeMode;
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
