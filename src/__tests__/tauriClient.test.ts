import { describe, expect, it } from "vitest";
import { formatRuntimeError, getRuntimeStatus, isPromptValid, sendLocalPrompt, type TauriInvoker } from "../services/tauriClient";

describe("tauriClient Sprint 0 contract", () => {
  it("rejects empty prompts before invoking Tauri", async () => {
    const invoker: TauriInvoker = async () => {
      throw new Error("invoker should not run");
    };

    await expect(sendLocalPrompt("   ", "fast", invoker)).rejects.toThrow("Enter a prompt before sending.");
    expect(isPromptValid("   ")).toBe(false);
  });

  it("returns mocked offline runtime status", async () => {
    const status = await getRuntimeStatus();

    expect(status).toMatchObject({
      health: "ok",
      modelLoaded: false,
      modelName: null,
      network: "disabled",
      vault: "not_indexed",
      memory: "local_only",
      sync: "disabled",
      privacy: "offline"
    });
  });

  it("sends a mocked local prompt response with the selected mode", async () => {
    const response = await sendLocalPrompt("Summarize local context", "thinking");

    expect(response).toEqual({
      response: "Local inference is not connected yet. This is the Sprint 0 mocked response.",
      modelId: null,
      mode: "thinking",
      route: "local_mock",
      elapsedMs: 0,
      finishReason: "mock_fallback",
      mocked: true
    });
  });

  it("surfaces mocked command failures", async () => {
    await expect(sendLocalPrompt("/fail", "fast")).rejects.toThrow("Sprint 0 mocked command failure.");
  });

  it("formats structured runtime errors", () => {
    expect(
      formatRuntimeError({
        code: "sidecar_timeout",
        message: "The local llama.cpp sidecar timed out.",
        userAction: "Try a shorter prompt."
      })
    ).toBe("The local llama.cpp sidecar timed out. Try a shorter prompt.");
  });
});
