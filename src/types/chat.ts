import type { RuntimeMode, RuntimeRoute } from "./runtime";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  body: string;
  mode?: RuntimeMode;
  route?: RuntimeRoute;
  mocked?: boolean;
};
