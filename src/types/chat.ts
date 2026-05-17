import type { FinishReason, GenerationState, RuntimeCommandError, RuntimeMode, RuntimeRoute } from "./runtime";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  body: string;
  mode?: RuntimeMode;
  route?: RuntimeRoute;
  modelId?: string;
  elapsedMs?: number;
  finishReason?: FinishReason;
  generationState?: GenerationState;
  runtimeError?: RuntimeCommandError | null;
  mocked?: boolean;
};
