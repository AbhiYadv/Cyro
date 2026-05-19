import type { FormEvent } from "react";
import {
  generationControlForState,
  providerDisplayName,
  providerRouteQualifier,
  shellComposerPlaceholder
} from "../../services/providerShell";
import type { ProviderShellGenerationState, ProviderShellReasoningMode } from "../../services/providerShell";
import { providerRouteOptions } from "../../services/providerSession";
import type { ProviderRouteId } from "../../types/provider";
import { ProviderToolsMenu } from "./ProviderToolsMenu";

type CyroComposerProps = {
  selectedProvider: ProviderRouteId;
  reasoningMode: ProviderShellReasoningMode;
  generationState: ProviderShellGenerationState;
  toolsOpen: boolean;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onProviderChange: (provider: ProviderRouteId) => void;
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
  onProviderChange,
  onReasoningChange,
  onToolsToggle,
  onToolsClose,
  onSend,
  onStop
}: CyroComposerProps) {
  const control = generationControlForState(generationState);

  return (
    <div className="cyro-composer-shell">
      <ProviderToolsMenu open={toolsOpen} onClose={onToolsClose} />
      <form className="cyro-composer" onSubmit={onSend}>
        <textarea
          aria-label="Provider shell prompt"
          placeholder={shellComposerPlaceholder(selectedProvider)}
          value={prompt}
          rows={2}
          onChange={(event) => onPromptChange(event.target.value)}
        />
        <div className="composer-control-row">
          <button type="button" className="composer-icon-button" onClick={onToolsToggle} aria-label="Open tools menu">
            +
          </button>
          <div className="provider-pill-selector" aria-label="Provider route">
            {providerRouteOptions.map((route) => {
              const qualifier = providerRouteQualifier(route.id);
              const label = providerDisplayName(route.id);

              return (
                <button
                  className={selectedProvider === route.id ? "provider-pill active" : "provider-pill"}
                  key={route.id}
                  type="button"
                  onClick={() => onProviderChange(route.id)}
                  aria-pressed={selectedProvider === route.id}
                  aria-label={qualifier ? `${label} ${qualifier}` : label}
                >
                  <span>{label}</span>
                  {qualifier ? <small>{qualifier}</small> : null}
                </button>
              );
            })}
          </div>
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
          {control.intent === "send" ? (
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
