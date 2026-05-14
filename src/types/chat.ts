import type { RuntimeMode } from "./runtime";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  body: string;
  mode?: RuntimeMode;
  mocked?: boolean;
};
