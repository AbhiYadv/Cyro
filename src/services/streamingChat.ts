import { formatRuntimeError } from "./tauriClient";
import type { ChatMessage } from "../types/chat";
import type { FinishReason, LocalPromptStreamEvent, StreamingPromptResult } from "../types/runtime";

export function applyStreamEventToMessage(message: ChatMessage, event: LocalPromptStreamEvent): ChatMessage {
  const next: ChatMessage = {
    ...message,
    route: event.route,
    modelId: event.modelId ?? message.modelId,
    elapsedMs: event.elapsedMs,
    finishReason: event.finishReason ?? message.finishReason,
    runtimeError: event.error ?? message.runtimeError
  };

  if (event.eventType === "started") {
    return { ...next, generationState: "streaming" };
  }

  if (event.eventType === "delta") {
    return {
      ...next,
      body: `${message.body}${event.delta ?? ""}`,
      generationState: "streaming"
    };
  }

  if (event.eventType === "completed") {
    return { ...next, generationState: "completed", finishReason: "completed" };
  }

  if (event.eventType === "cancelled") {
    return { ...next, generationState: "cancelled", finishReason: "cancelled" };
  }

  if (event.eventType === "timeout") {
    return { ...next, generationState: "timed_out", finishReason: "timed_out" };
  }

  return { ...next, generationState: "failed", finishReason: "error" };
}

export function applyStreamingResultToMessage(message: ChatMessage, result: StreamingPromptResult): ChatMessage {
  const finishReason = result.finishReason;
  const generationState = generationStateForFinishReason(finishReason);

  return {
    ...message,
    body: result.finalText || message.body,
    route: result.route,
    modelId: result.modelId ?? message.modelId,
    elapsedMs: result.elapsedMs,
    finishReason,
    generationState,
    runtimeError: result.error
  };
}

export function finishReasonStatusLabel(reason?: FinishReason | null) {
  if (reason === "cancelled") {
    return "Cancelled";
  }

  if (reason === "timed_out") {
    return "Timed out";
  }

  if (reason === "error") {
    return "Error";
  }

  return null;
}

export function streamingErrorText(message: ChatMessage) {
  if (!message.runtimeError) {
    return null;
  }

  return formatRuntimeError(message.runtimeError);
}

export function isSendDisabledWhileGenerating(isGenerating: boolean) {
  return isGenerating;
}

export function isCancelVisibleWhileGenerating(isGenerating: boolean) {
  return isGenerating;
}

function generationStateForFinishReason(reason: FinishReason): ChatMessage["generationState"] {
  if (reason === "cancelled") {
    return "cancelled";
  }

  if (reason === "timed_out") {
    return "timed_out";
  }

  if (reason === "error") {
    return "failed";
  }

  return "completed";
}
