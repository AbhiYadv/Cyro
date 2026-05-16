import { describe, expect, it } from "vitest";
import {
  formatRuntimeError,
  cancelGeneration,
  getRuntimeStatus,
  isPromptValid,
  runRuntimeBenchmark,
  sendLocalPrompt,
  sendLocalPromptStreaming,
  type TauriInvoker
} from "../services/tauriClient";
import type { LocalPromptStreamEvent } from "../types/runtime";

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
      benchmark: {
        status: "not_run"
      },
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

  it("invokes streaming prompt command and receives ordered events", async () => {
    const receivedEvents: LocalPromptStreamEvent[] = [];
    let streamHandler: ((event: LocalPromptStreamEvent) => void) | null = null;
    const subscribe = async (handler: (event: LocalPromptStreamEvent) => void) => {
      streamHandler = handler;
      return () => {
        streamHandler = null;
      };
    };
    const invoker: TauriInvoker = async <T>(command: string, args?: Record<string, unknown>) => {
      expect(command).toBe("send_local_prompt_streaming");
      expect(args).toMatchObject({
        prompt: "Answer locally",
        mode: "fast",
        modelId: "qwen-0_8b-local",
        maxTokens: 120,
        stream: true
      });
      streamHandler?.({
        generationId: "generation:1",
        eventType: "started",
        delta: null,
        elapsedMs: 0,
        modelId: "qwen-0_8b-local",
        route: "local_sidecar",
        sequence: 0,
        finishReason: null,
        error: null
      });
      streamHandler?.({
        generationId: "generation:1",
        eventType: "delta",
        delta: "local ",
        elapsedMs: 4,
        modelId: "qwen-0_8b-local",
        route: "local_sidecar",
        sequence: 1,
        finishReason: null,
        error: null
      });
      streamHandler?.({
        generationId: "generation:1",
        eventType: "completed",
        delta: null,
        elapsedMs: 8,
        modelId: "qwen-0_8b-local",
        route: "local_sidecar",
        sequence: 2,
        finishReason: "completed",
        error: null
      });
      return {
        generationId: "generation:1",
        finalText: "local answer",
        finishReason: "completed",
        elapsedMs: 8,
        route: "local_sidecar",
        modelId: "qwen-0_8b-local",
        cancelled: false,
        timedOut: false,
        error: null
      } as T;
    };

    const result = await sendLocalPromptStreaming("Answer locally", "fast", (event) => receivedEvents.push(event), invoker, subscribe);

    expect(result.finalText).toBe("local answer");
    expect(receivedEvents.map((event) => event.eventType)).toEqual(["started", "delta", "completed"]);
  });

  it("invokes cancel_generation with the active generation id", async () => {
    const invoker: TauriInvoker = async <T>(command: string, args?: Record<string, unknown>) => {
      expect(command).toBe("cancel_generation");
      expect(args).toEqual({ generationId: "generation:1" });
      return {
        generationId: "generation:1",
        state: "cancelling",
        cancelled: true,
        message: "Cancellation requested."
      } as T;
    };

    const result = await cancelGeneration("generation:1", invoker);

    expect(result).toMatchObject({ cancelled: true, state: "cancelling" });
  });

  it("invokes the native local benchmark command with fixed development gate arguments", async () => {
    const invoker: TauriInvoker = async <T>(command: string, args?: Record<string, unknown>) => {
      expect(command).toBe("run_runtime_benchmark");
      expect(args).toEqual({
        modelId: "qwen-0_8b-local",
        mode: "fast",
        maxTokens: 80,
        timeoutMs: 60_000
      });
      return {
        benchmarkId: "benchmark:1:qwen-0_8b-local",
        status: "passed",
        modelId: "qwen-0_8b-local",
        modelFileName: "qwen-test.gguf",
        modelFileSizeMb: 512,
        route: "local_sidecar",
        mode: "fast",
        elapsedMs: 11_000,
        tokensPerSecondOptional: 4.2,
        latencyClass: "acceptable",
        passed: true,
        reason: "Benchmark passed.",
        createdAt: "unix:1"
      } as T;
    };

    const result = await runRuntimeBenchmark("fast", invoker);

    expect(result).toMatchObject({
      route: "local_sidecar",
      latencyClass: "acceptable",
      elapsedMs: 11_000
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
