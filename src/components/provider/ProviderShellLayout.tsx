import { FormEvent, useReducer, useState } from "react";
import { RuntimePanel } from "../runtime/RuntimePanel";
import {
  defaultProviderShellState,
  providerDisplayName,
  providerShellReducer,
  shellComposerPlaceholder
} from "../../services/providerShell";
import { isProviderId } from "../../services/providerSession";
import {
  formatRuntimeError,
  openInLayoutProviderContainer,
  openNativeProviderContainer
} from "../../services/tauriClient";
import type { ProviderShellReasoningMode } from "../../services/providerShell";
import type { ProviderId, ProviderNativeContainerStatus, ProviderRouteId } from "../../types/provider";
import type { RuntimeStatus } from "../../types/runtime";
import { CyroComposer } from "./CyroComposer";
import { CyroLeftDrawer } from "./CyroLeftDrawer";
import { CyroPresence } from "./CyroPresence";
import { ProviderBlockedState } from "./ProviderBlockedState";
import { ProviderHeader } from "./ProviderHeader";

type ProviderShellLayoutProps = {
  runtimeStatus: RuntimeStatus;
  onRuntimeRefresh: () => Promise<RuntimeStatus>;
};

export function ProviderShellLayout({ runtimeStatus, onRuntimeRefresh }: ProviderShellLayoutProps) {
  const [shellState, dispatch] = useReducer(providerShellReducer, defaultProviderShellState);
  const [prompt, setPrompt] = useState("");
  const [composerNotice, setComposerNotice] = useState<string | null>(null);
  const [nativeContainerStatus, setNativeContainerStatus] = useState<Record<ProviderId, ProviderNativeContainerStatus>>({
    chatgpt: "untested",
    claude: "untested",
    gemini: "untested"
  });
  const [nativeContainerMessage, setNativeContainerMessage] = useState<Record<ProviderId, string | null>>({
    chatgpt: null,
    claude: null,
    gemini: null
  });

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

  async function handleOpenInLayoutContainer(provider: ProviderRouteId) {
    if (!isProviderId(provider)) {
      return;
    }

    setNativeContainerStatus((current) => ({ ...current, [provider]: "opening" }));
    setNativeContainerMessage((current) => ({
      ...current,
      [provider]: `${providerDisplayName(provider)} in-layout native container opening. Provider page stays visible and user-controlled.`
    }));

    try {
      const result = await openInLayoutProviderContainer(provider);
      setNativeContainerStatus((current) => ({ ...current, [provider]: result.status }));
      setNativeContainerMessage((current) => ({
        ...current,
        [provider]:
          `${result.message} This does not validate provider login, chat, or session persistence; record manual behavior before any success claim.`
      }));
    } catch (error) {
      setNativeContainerStatus((current) => ({ ...current, [provider]: "failed" }));
      setNativeContainerMessage((current) => ({
        ...current,
        [provider]: formatRuntimeError(error, "In-layout native provider container failed to open.")
      }));
    }
  }

  async function handleOpenSeparateWindowFallback(provider: ProviderRouteId) {
    if (!isProviderId(provider)) {
      return;
    }

    setNativeContainerStatus((current) => ({ ...current, [provider]: "opening" }));
    setNativeContainerMessage((current) => ({
      ...current,
      [provider]: `${providerDisplayName(provider)} separate-window fallback opening. This is not final in-layout UX.`
    }));

    try {
      const result = await openNativeProviderContainer(provider);
      setNativeContainerStatus((current) => ({ ...current, [provider]: result.status }));
      setNativeContainerMessage((current) => ({
        ...current,
        [provider]:
          `${result.message} Separate-window fallback does not validate final in-layout provider UX, login, chat, or session persistence.`
      }));
    } catch (error) {
      setNativeContainerStatus((current) => ({ ...current, [provider]: "failed" }));
      setNativeContainerMessage((current) => ({
        ...current,
        [provider]: formatRuntimeError(error, "Separate-window provider fallback failed to open.")
      }));
    }
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
            <div className="provider-home-presence">
              <CyroPresence
                provider={shellState.selectedProvider}
                status={shellState.providerSurfaceStatus}
                generationState={shellState.generationState}
              />
              <h1>Cyro is ready</h1>
            </div>
          ) : (
            <ProviderBlockedState
              provider={shellState.selectedProvider}
              status={shellState.providerSurfaceStatus}
              nativeContainerStatus={nativeContainerStatus[shellState.selectedProvider]}
              nativeContainerMessage={nativeContainerMessage[shellState.selectedProvider]}
              onOpenInLayoutContainer={() => handleOpenInLayoutContainer(shellState.selectedProvider)}
              onOpenSeparateWindowFallback={() => handleOpenSeparateWindowFallback(shellState.selectedProvider)}
            />
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
