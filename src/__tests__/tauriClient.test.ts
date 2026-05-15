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
      runtimeState: "not_configured",
      activeRoute: "local_mock",
      network: "disabled",
      vault: "not_indexed",
      memory: "local_only",
      sync: "disabled",
      privacy: "offline"
    });
  });

  it("surfaces local_sidecar response metadata from Tauri", async () => {
    const invoker: TauriInvoker = async <T>(command: string) => {
      expect(command).toBe("send_local_prompt");
      return {
        response: "local answer",
        modelId: "qwen-0_8b-local",
        mode: "fast",
        route: "local_sidecar",
        elapsedMs: 42,
        finishReason: "completed",
        mocked: false
      } as T;
    };

    const response = await sendLocalPrompt("Answer locally", "fast", invoker);

    expect(response).toMatchObject({
      route: "local_sidecar",
      modelId: "qwen-0_8b-local",
      mocked: false
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

  it("formats direct string command errors from Tauri", () => {
    expect(formatRuntimeError("Model path does not exist. Select an existing local .gguf file.")).toBe(
      "Model path does not exist. Select an existing local .gguf file."
    );
  });
});
