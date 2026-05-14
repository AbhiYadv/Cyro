export type RuntimeMode = "fast" | "thinking";

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
  mode: RuntimeMode;
  mocked: true;
};
