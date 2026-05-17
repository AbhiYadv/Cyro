import { describe, expect, it } from "vitest";
import {
  applyStreamingResultToMessage,
  applyStreamEventToMessage,
  cancelButtonLabel,
  finishReasonStatusLabel,
  hasActiveGenerationId,
  isCancelDisabledWhileGenerating,
  isCancelVisibleWhileGenerating,
  isGenerationActive,
  isGenerationControlActive,
  isSendDisabledWhileGenerating,
  streamingErrorText
} from "../services/streamingChat";
import type { ChatMessage } from "../types/chat";

function assistantMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "assistant:1",
    role: "assistant",
    body: "",
    mode: "fast",
    route: "local_sidecar",
    generationState: "starting",
    ...overrides
  };
}

describe("streaming chat message reducer", () => {
  it("appends partial output in event order", () => {
    const first = applyStreamEventToMessage(assistantMessage(), {
      generationId: "generation:1",
      eventType: "delta",
      delta: "hello ",
      elapsedMs: 10,
      modelId: "qwen-0_8b-local",
      route: "local_sidecar",
      sequence: 1,
      finishReason: null,
      error: null
    });
    const second = applyStreamEventToMessage(first, {
      generationId: "generation:1",
      eventType: "delta",
      delta: "world",
      elapsedMs: 20,
      modelId: "qwen-0_8b-local",
      route: "local_sidecar",
      sequence: 2,
      finishReason: null,
      error: null
    });

    expect(second.body).toBe("hello world");
    expect(second.generationState).toBe("streaming");
    expect(second.modelId).toBe("qwen-0_8b-local");
  });

  it("labels cancelled streaming messages", () => {
    const cancelled = applyStreamEventToMessage(assistantMessage({ body: "partial" }), {
      generationId: "generation:1",
      eventType: "cancelled",
      delta: null,
      elapsedMs: 30,
      modelId: "qwen-0_8b-local",
      route: "local_sidecar",
      sequence: 3,
      finishReason: "cancelled",
      error: null
    });

    expect(cancelled.finishReason).toBe("cancelled");
    expect(cancelled.generationState).toBe("cancelled");
    expect(finishReasonStatusLabel(cancelled.finishReason)).toBe("Cancelled");
  });

  it("surfaces timeout and error as actionable message metadata", () => {
    const timedOut = applyStreamingResultToMessage(assistantMessage({ body: "partial" }), {
      generationId: "generation:1",
      finalText: "partial",
      finishReason: "timed_out",
      elapsedMs: 60_000,
      route: "local_sidecar",
      modelId: "qwen-0_8b-local",
      cancelled: false,
      timedOut: true,
      error: {
        code: "sidecar_timeout",
        message: "The local llama.cpp sidecar timed out.",
        userAction: "Try a smaller model."
      }
    });

    expect(timedOut.generationState).toBe("timed_out");
    expect(finishReasonStatusLabel(timedOut.finishReason)).toBe("Timed out");
    expect(streamingErrorText(timedOut)).toBe("The local llama.cpp sidecar timed out. Try a smaller model.");
  });

  it("blocks send and shows cancel while generating", () => {
    expect(isSendDisabledWhileGenerating(true)).toBe(true);
    expect(isCancelVisibleWhileGenerating(true)).toBe(true);
    expect(isSendDisabledWhileGenerating(false)).toBe(false);
    expect(isCancelVisibleWhileGenerating(false)).toBe(false);
    expect(isGenerationActive("streaming")).toBe(true);
    expect(isSendDisabledWhileGenerating("streaming")).toBe(true);
    expect(isCancelVisibleWhileGenerating("streaming")).toBe(true);
    expect(isCancelDisabledWhileGenerating("streaming")).toBe(false);
    expect(cancelButtonLabel("streaming")).toBe("Stop");
  });

  it("keeps generation controls active when Rust has supplied a generation id", () => {
    expect(hasActiveGenerationId("generation:1")).toBe(true);
    expect(hasActiveGenerationId(null)).toBe(false);
    expect(isGenerationControlActive("idle", "generation:1")).toBe(true);
    expect(isCancelVisibleWhileGenerating("idle", "generation:1")).toBe(true);
    expect(isSendDisabledWhileGenerating("idle", "generation:1")).toBe(true);
  });

  it("keeps cancel visible but disabled once cancellation is in progress", () => {
    expect(isGenerationActive("cancelling")).toBe(true);
    expect(isSendDisabledWhileGenerating("cancelling")).toBe(true);
    expect(isCancelVisibleWhileGenerating("cancelling")).toBe(true);
    expect(isCancelDisabledWhileGenerating("cancelling")).toBe(true);
    expect(cancelButtonLabel("cancelling")).toBe("Cancelling");
    expect(isGenerationActive("cancelled")).toBe(false);
  });
});
