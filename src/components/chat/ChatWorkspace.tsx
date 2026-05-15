import { FormEvent, useState } from "react";
import { routeLabel } from "../../services/runtimeStatus";
import { formatRuntimeError, sendLocalPrompt } from "../../services/tauriClient";
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

    setMessages((current) => [...current, userMessage]);
    setPrompt("");

    try {
      const result = await sendLocalPrompt(trimmedPrompt, mode);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          body: result.response,
          mode: result.mode,
          route: result.route,
          modelId: result.modelId ?? undefined,
          elapsedMs: result.elapsedMs,
          mocked: result.mocked
        }
      ]);
    } catch (caughtError) {
      setError(formatRuntimeError(caughtError));
    } finally {
      try {
        await onPromptComplete?.();
      } catch {
        // Runtime status refresh is secondary to the prompt result.
      }
      setIsLoading(false);
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
            <p>{message.body}</p>
            {message.role === "assistant" ? <span className="route-label">{messageMetadata(message)}</span> : null}
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
          disabled={isLoading}
          rows={3}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Sending" : "Send"}
        </button>
      </form>
    </section>
  );
}
