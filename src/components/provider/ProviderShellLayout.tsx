import { FormEvent, useReducer, useState } from "react";
import { RuntimePanel } from "../runtime/RuntimePanel";
import {
  defaultProviderShellState,
  providerDisplayName,
  providerShellReducer,
  shellComposerPlaceholder
} from "../../services/providerShell";
import type { ProviderShellReasoningMode } from "../../services/providerShell";
import type { ProviderRouteId } from "../../types/provider";
import type { RuntimeStatus } from "../../types/runtime";
import { CyroComposer } from "./CyroComposer";
import { CyroLeftDrawer } from "./CyroLeftDrawer";
import { ProviderBlockedState } from "./ProviderBlockedState";
import { ProviderHeader } from "./ProviderHeader";

type ProviderShellLayoutProps = {
  runtimeStatus: RuntimeStatus;
  onRuntimeRefresh: () => Promise<RuntimeStatus>;
};

const promptChips = ["Prepare context capsule", "Inspect approved memory", "Draft with local context", "Review provider boundary"];

export function ProviderShellLayout({ runtimeStatus, onRuntimeRefresh }: ProviderShellLayoutProps) {
  const [shellState, dispatch] = useReducer(providerShellReducer, defaultProviderShellState);
  const [prompt, setPrompt] = useState("");
  const [composerNotice, setComposerNotice] = useState<string | null>(null);

  function handleProviderChange(provider: ProviderRouteId) {
    dispatch({ type: "select_provider", provider });
    setComposerNotice(null);
  }

  function handleReasoningChange(reasoningMode: ProviderShellReasoningMode) {
    dispatch({ type: "select_reasoning", reasoningMode });
  }

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!prompt.trim()) {
      setComposerNotice(`Enter a prompt for ${providerDisplayName(shellState.selectedProvider)}.`);
      return;
    }

    setComposerNotice(
      `${providerDisplayName(shellState.selectedProvider)} send is represented in shell state only. No provider prompt was sent.`
    );
    setPrompt("");
    dispatch({ type: "set_generation_state", generationState: "starting" });
  }

  function handleStop() {
    dispatch({ type: "set_generation_state", generationState: "cancelled" });
    setComposerNotice("Shell generation state cancelled. No provider session was controlled.");
  }

  return (
    <div className="provider-shell-layout">
      <CyroLeftDrawer
        open={shellState.drawerOpen}
        onToggle={() => dispatch({ type: "toggle_drawer" })}
        onClose={() => dispatch({ type: "close_drawer" })}
      />

      <main className="provider-shell-main" aria-label="Cyro provider shell chat prototype">
        <ProviderHeader
          selectedProvider={shellState.selectedProvider}
          reasoningMode={shellState.reasoningMode}
          generationState={shellState.generationState}
          providerSurfaceStatus={shellState.providerSurfaceStatus}
          diagnosticsOpen={shellState.diagnosticsOpen}
          onDrawerToggle={() => dispatch({ type: "toggle_drawer" })}
          onDiagnosticsToggle={() => dispatch({ type: "toggle_diagnostics" })}
        />

        <section className="provider-chat-stage" aria-label="Provider shell stage">
          {shellState.selectedProvider === "local" ? (
            <div className="provider-welcome">
              <div className="provider-welcome-copy">
                <p className="eyebrow">Sovereign memory workspace</p>
                <h1>What should Cyro help prepare?</h1>
                <p>
                  One composer routes work to Local, ChatGPT, Claude, or Gemini while Cyro keeps memory, vault, and
                  provider boundaries visible.
                </p>
              </div>
              <div className="local-chat-canvas" aria-label="Local chat workspace preview">
                <div className="local-chat-turn assistant">
                  <span>Cyro</span>
                  <p>Local route is ready for drafting with approved context.</p>
                </div>
                <div className="local-chat-turn user">
                  <span>You</span>
                  <p>{prompt || "Ask Cyro to prepare context, inspect memory, or draft a response."}</p>
                </div>
              </div>
              <div className="prompt-chip-list" aria-label="Prompt starters">
                {promptChips.map((chip) => (
                  <button type="button" key={chip} onClick={() => setPrompt(chip)}>
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ProviderBlockedState provider={shellState.selectedProvider} status={shellState.providerSurfaceStatus} />
          )}
        </section>

        {composerNotice ? (
          <div className="composer-notice" role="status">
            {composerNotice}
          </div>
        ) : null}

        {shellState.diagnosticsOpen ? (
          <section className="provider-diagnostics-panel" aria-label="Runtime diagnostics">
            <RuntimePanel status={runtimeStatus} onStatusRefresh={onRuntimeRefresh} />
          </section>
        ) : (
          <section className="provider-diagnostics-compact" aria-label="Compact runtime diagnostics">
            <span>Runtime: {runtimeStatus.runtimeState}</span>
            <span>Route: {runtimeStatus.activeRoute}</span>
            <span>Privacy: {runtimeStatus.privacy}</span>
          </section>
        )}

        <CyroComposer
          selectedProvider={shellState.selectedProvider}
          reasoningMode={shellState.reasoningMode}
          generationState={shellState.generationState}
          toolsOpen={shellState.toolsOpen}
          prompt={prompt}
          onPromptChange={setPrompt}
          onProviderChange={handleProviderChange}
          onReasoningChange={handleReasoningChange}
          onToolsToggle={() => dispatch({ type: "toggle_tools" })}
          onToolsClose={() => dispatch({ type: "close_tools" })}
          onSend={handleSend}
          onStop={handleStop}
        />

        <span className="composer-placeholder-measure" aria-hidden="true">
          {shellComposerPlaceholder(shellState.selectedProvider)}
        </span>
      </main>
    </div>
  );
}
