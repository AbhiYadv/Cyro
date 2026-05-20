import type { FormEvent } from "react";
import {
  generationControlForState,
  shellComposerPlaceholder
} from "../../services/providerShell";
import type { ProviderShellGenerationState, ProviderShellReasoningMode } from "../../services/providerShell";
import type { ProviderRouteId } from "../../types/provider";
import { ProviderToolsMenu } from "./ProviderToolsMenu";

type CyroComposerProps = {
  selectedProvider: ProviderRouteId;
  reasoningMode: ProviderShellReasoningMode;
  generationState: ProviderShellGenerationState;
  toolsOpen: boolean;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onReasoningChange: (mode: ProviderShellReasoningMode) => void;
  onToolsToggle: () => void;
  onToolsClose: () => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
};

const reasoningOptions: Array<{ id: ProviderShellReasoningMode; label: string }> = [
  { id: "fast", label: "Fast" },
  { id: "think", label: "Think" },
  { id: "pro", label: "Pro" }
];

export function CyroComposer({
  selectedProvider,
  reasoningMode,
  generationState,
  toolsOpen,
  prompt,
  onPromptChange,
  onReasoningChange,
  onToolsToggle,
  onToolsClose,
  onSend,
  onStop
}: CyroComposerProps) {
  const control = generationControlForState(generationState);
  const isLocalRoute = selectedProvider === "local";

  return (
    <div className={isLocalRoute ? "cyro-composer-shell" : "cyro-composer-shell bridge-pending"}>
      <ProviderToolsMenu open={toolsOpen} onClose={onToolsClose} />
      <form className="cyro-composer" onSubmit={onSend}>
        <textarea
          aria-label="Provider shell prompt"
          placeholder={shellComposerPlaceholder(selectedProvider)}
          value={prompt}
          rows={2}
          disabled={!isLocalRoute}
          onChange={(event) => onPromptChange(event.target.value)}
        />
        <div className="composer-control-row">
          <button type="button" className="composer-icon-button" onClick={onToolsToggle} aria-label="Open tools menu">
            +
          </button>
          {isLocalRoute ? (
            <div className="reasoning-selector" aria-label="Reasoning selector">
              {reasoningOptions.map((option) => (
                <button
                  className={reasoningMode === option.id ? "reasoning-pill active" : "reasoning-pill"}
                  key={option.id}
                  type="button"
                  onClick={() => onReasoningChange(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          {!isLocalRoute ? (
            <span className="composer-bridge-copy">Prompt bridge coming later — use the provider box inside the session.</span>
          ) : control.intent === "send" ? (
            <button className="composer-send-button" type="submit">
              {control.label}
            </button>
          ) : (
            <button className="composer-stop-button" type="button" onClick={onStop}>
              {control.label}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
