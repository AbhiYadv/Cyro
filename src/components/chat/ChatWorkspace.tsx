import { FormEvent, useState } from "react";
import { routeLabel } from "../../services/runtimeStatus";
import {
  applyStreamingResultToMessage,
  applyStreamEventToMessage,
  finishReasonStatusLabel,
  isCancelVisibleWhileGenerating,
  isSendDisabledWhileGenerating,
  streamingErrorText
} from "../../services/streamingChat";
import { cancelGeneration, formatRuntimeError, sendLocalPromptStreaming } from "../../services/tauriClient";
import type { ChatMessage } from "../../types/chat";
import type { RuntimeMode } from "../../types/runtime";

type ChatWorkspaceProps = {
  mode: RuntimeMode;
  onModeChange: (mode: RuntimeMode) => void;
  onPromptComplete?: () => Promise<unknown>;
};

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    body: "Cyro Local Brain is online. Configure a local sidecar to use a validated GGUF; otherwise responses use the mock fallback.",
    mode: "fast",
    route: "local_mock",
    mocked: true
  }
];

function messageMetadata(message: ChatMessage) {
  const details = [];

  if (message.route) {
    details.push(routeLabel(message.route));
  }

  if (message.modelId) {
    details.push(message.modelId);
  }

  if (typeof message.elapsedMs === "number" && message.elapsedMs > 0) {
    details.push(`${message.elapsedMs}ms`);
  }

  return details.join(" · ");
}

export function ChatWorkspace({ mode, onModeChange, onPromptComplete }: ChatWorkspaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setError("Enter a prompt before sending.");
      return;
    }

    setError(null);
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      body: trimmedPrompt,
      mode
    };
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      body: "",
      mode,
      route: "local_sidecar",
      generationState: "starting"
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setPrompt("");

    try {
      const result = await sendLocalPromptStreaming(trimmedPrompt, mode, (event) => {
        if (event.eventType === "started") {
          setActiveGenerationId(event.generationId);
          void onPromptComplete?.();
        }

        if (event.eventType === "completed" || event.eventType === "cancelled" || event.eventType === "timeout" || event.eventType === "error") {
          void onPromptComplete?.();
        }

        setMessages((current) =>
          current.map((message) => (message.id === assistantMessageId ? applyStreamEventToMessage(message, event) : message))
        );
      });
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? {
                ...applyStreamingResultToMessage(message, result),
                mocked: result.route === "local_mock"
              }
            : message
        )
      );
    } catch (caughtError) {
      setError(formatRuntimeError(caughtError));
      setMessages((current) => current.filter((message) => message.id !== assistantMessageId));
    } finally {
      try {
        await onPromptComplete?.();
      } catch {
        // Runtime status refresh is secondary to the prompt result.
      }
      setActiveGenerationId(null);
      setIsLoading(false);
    }
  }

  async function handleCancel() {
    if (!activeGenerationId) {
      return;
    }

    try {
      await cancelGeneration(activeGenerationId);
    } catch (caughtError) {
      setError(formatRuntimeError(caughtError, "Cancel failed."));
    }
  }

  return (
    <section className="chat-workspace" aria-label="Cyro Local Brain chat">
      <div className="chat-heading">
        <div>
          <p className="eyebrow">Welcome state</p>
          <h2>Cyro Local Brain</h2>
        </div>
        <div className="mode-toggle" aria-label="Runtime mode">
          <button className={mode === "fast" ? "mode-button active" : "mode-button"} type="button" onClick={() => onModeChange("fast")}>
            Fast Mode
          </button>
          <button
            className={mode === "thinking" ? "mode-button active" : "mode-button"}
            type="button"
            onClick={() => onModeChange("thinking")}
          >
            Thinking Mode
          </button>
        </div>
      </div>

      <div className="message-list" aria-live="polite">
        {messages.map((message) => (
          <article className={`message-bubble ${message.role}`} key={message.id}>
            <span className="message-role">{message.role === "user" ? "You" : "Cyro"}</span>
            <p>{message.body || (message.generationState === "starting" ? "Starting local generation..." : "")}</p>
            {message.role === "assistant" ? <span className="route-label">{messageMetadata(message)}</span> : null}
            {finishReasonStatusLabel(message.finishReason) ? <span className="finish-label">{finishReasonStatusLabel(message.finishReason)}</span> : null}
            {streamingErrorText(message) ? <span className="message-error">{streamingErrorText(message)}</span> : null}
            {message.mocked ? <span className="mock-label">Mocked</span> : null}
          </article>
        ))}
      </div>

      {error ? (
        <div className="error-banner" role="alert">
          {error}
        </div>
      ) : null}

      <form className="composer" onSubmit={handleSubmit}>
        <textarea
          aria-label="Prompt"
          placeholder="Ask the local brain..."
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={isSendDisabledWhileGenerating(isLoading)}
          rows={3}
        />
        <button type="submit" disabled={isSendDisabledWhileGenerating(isLoading)}>
          {isLoading ? "Sending" : "Send"}
        </button>
        {isCancelVisibleWhileGenerating(isLoading) ? (
          <button className="cancel-button" type="button" onClick={handleCancel} disabled={!activeGenerationId}>
            Cancel
          </button>
        ) : null}
      </form>
    </section>
  );
}
