import { FormEvent, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { RuntimePanel } from "../runtime/RuntimePanel";
import {
  defaultProviderShellState,
  providerDisplayName,
  providerShellReducer,
  shellComposerPlaceholder,
  shouldAutoOpenProvider
} from "../../services/providerShell";
import { isProviderId } from "../../services/providerSession";
import {
  formatRuntimeError,
  hideInLayoutProviderContainer,
  openInLayoutProviderContainer,
  openNativeProviderContainer,
  resizeInLayoutProviderContainer
} from "../../services/tauriClient";
import type { ProviderShellReasoningMode } from "../../services/providerShell";
import type {
  ProviderContainerState,
  ProviderId,
  ProviderNativeContainerStatus,
  ProviderRouteId,
  ProviderViewportBounds
} from "../../types/provider";
import type { RuntimeStatus } from "../../types/runtime";
import { CyroComposer } from "./CyroComposer";
import { CyroLeftDrawer } from "./CyroLeftDrawer";
import { CyroPresence } from "./CyroPresence";
import { ProviderContainerSurface } from "./ProviderContainerSurface";
import { ProviderHeader } from "./ProviderHeader";
import { ProviderTabRail } from "./ProviderTabRail";

type ProviderShellLayoutProps = {
  runtimeStatus: RuntimeStatus;
  onRuntimeRefresh: () => Promise<RuntimeStatus>;
};

export function ProviderShellLayout({ runtimeStatus, onRuntimeRefresh }: ProviderShellLayoutProps) {
  const [shellState, dispatch] = useReducer(providerShellReducer, defaultProviderShellState);
  const providerViewportRef = useRef<HTMLDivElement | null>(null);
  const [prompt, setPrompt] = useState("");
  const [composerNotice, setComposerNotice] = useState<string | null>(null);
  const [nativeContainerStatus, setNativeContainerStatus] = useState<Record<ProviderId, ProviderContainerState>>({
    chatgpt: "iframe_blocked",
    claude: "idle",
    gemini: "idle"
  });
  const [nativeContainerMessage, setNativeContainerMessage] = useState<Record<ProviderId, string | null>>({
    chatgpt: null,
    claude: null,
    gemini: null
  });
  const activeProvider = isProviderId(shellState.selectedProvider) ? shellState.selectedProvider : null;
  const activeContainerState = activeProvider
    ? nativeContainerStatus[activeProvider]
    : "idle";

  // Auto-open in-layout container when user selects a provider tab.
  // nativeContainerStatus and handleOpenInLayoutContainer intentionally omitted — we only want this to fire on tab change.
  useEffect(() => {
    const provider = shellState.selectedProvider;
    if (!isProviderId(provider)) return;
    if (shouldAutoOpenProvider(provider, nativeContainerStatus[provider])) {
      void handleOpenInLayoutContainer(provider);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shellState.selectedProvider]);

  const readProviderViewportBounds = useCallback((): ProviderViewportBounds | null => {
    const viewport = providerViewportRef.current;
    if (!viewport) {
      return null;
    }

    const rect = viewport.getBoundingClientRect();
    const bounds = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };

    const values = Object.values(bounds);
    if (values.some((value) => !Number.isFinite(value)) || bounds.width < 320 || bounds.height < 280) {
      return null;
    }

    return {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height)
    };
  }, []);

  const readProviderViewportBoundsAfterPaint = useCallback(async () => {
    await waitForNextFrame();
    await waitForNextFrame();
    return readProviderViewportBounds();
  }, [readProviderViewportBounds]);

  const syncProviderViewportBounds = useCallback(
    async (provider: ProviderId) => {
      const viewportBounds = readProviderViewportBounds();
      if (!viewportBounds) {
        return;
      }

      try {
        await resizeInLayoutProviderContainer(provider, viewportBounds);
      } catch (error) {
        setNativeContainerStatus((current) => ({ ...current, [provider]: "native_failed" }));
        setNativeContainerMessage((current) => ({
          ...current,
          [provider]: formatRuntimeError(error, "In-layout native provider container failed to resize.")
        }));
      }
    },
    [readProviderViewportBounds]
  );

  useEffect(() => {
    if (!activeProvider || activeContainerState !== "native_visible") {
      return;
    }

    let cancelled = false;
    const sync = () => {
      if (!cancelled) {
        void syncProviderViewportBounds(activeProvider);
      }
    };

    void waitForNextFrame().then(sync);
    window.addEventListener("resize", sync);
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && providerViewportRef.current
        ? new ResizeObserver(sync)
        : null;
    resizeObserver?.observe(providerViewportRef.current as Element);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", sync);
      resizeObserver?.disconnect();
    };
  }, [activeProvider, activeContainerState, syncProviderViewportBounds]);

  async function handleProviderChange(provider: ProviderRouteId) {
    const previousProvider = shellState.selectedProvider;
    if (
      provider !== previousProvider &&
      isProviderId(previousProvider) &&
      nativeContainerStatus[previousProvider] === "native_visible"
    ) {
      try {
        await hideInLayoutProviderContainer(previousProvider);
        setNativeContainerStatus((current) => ({
          ...current,
          [previousProvider]: "native_hidden"
        }));
        setNativeContainerMessage((current) => ({
          ...current,
          [previousProvider]: `${providerDisplayName(previousProvider)} provider session is hidden but not closed.`
        }));
      } catch (error) {
        setNativeContainerStatus((current) => ({ ...current, [previousProvider]: "native_failed" }));
        setNativeContainerMessage((current) => ({
          ...current,
          [previousProvider]: formatRuntimeError(error, "In-layout native provider container failed to hide.")
        }));
      }
    }

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

    setNativeContainerStatus((current) => ({ ...current, [provider]: "native_opening" }));
    setNativeContainerMessage((current) => ({
      ...current,
      [provider]: `${providerDisplayName(provider)} in-layout native container opening. Provider page stays visible and user-controlled.`
    }));

    try {
      const viewportBounds = await readProviderViewportBoundsAfterPaint();
      if (!viewportBounds) {
        throw new Error("Provider viewport geometry was not available.");
      }

      const result = await openInLayoutProviderContainer(provider, viewportBounds);
      setNativeContainerStatus((current) => ({ ...current, [provider]: providerContainerStateFromNativeStatus(result.status) }));
      setNativeContainerMessage((current) => ({
        ...current,
        [provider]:
          `${result.message} This does not validate provider login, chat, or session persistence; record manual behavior before any success claim.`
      }));
    } catch (error) {
      setNativeContainerStatus((current) => ({ ...current, [provider]: "native_failed" }));
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

    setNativeContainerStatus((current) => ({ ...current, [provider]: "native_opening" }));
    setNativeContainerMessage((current) => ({
      ...current,
      [provider]: `${providerDisplayName(provider)} separate-window fallback opening. This is not final in-layout UX.`
    }));

    try {
      const result = await openNativeProviderContainer(provider);
      setNativeContainerStatus((current) => ({ ...current, [provider]: providerContainerStateFromNativeStatus(result.status) }));
      setNativeContainerMessage((current) => ({
        ...current,
        [provider]:
          `${result.message} Separate-window fallback does not validate final in-layout provider UX, login, chat, or session persistence.`
      }));
    } catch (error) {
      setNativeContainerStatus((current) => ({ ...current, [provider]: "native_failed" }));
      setNativeContainerMessage((current) => ({
        ...current,
        [provider]: formatRuntimeError(error, "Separate-window provider fallback failed to open.")
      }));
    }
  }

  const isLocalRoute = shellState.selectedProvider === "local";
  const mainClassName = isLocalRoute ? "provider-shell-main local-mode" : "provider-shell-main provider-mode";
  const stageClassName = [
    "provider-chat-stage",
    isLocalRoute ? "local-stage" : "provider-stage",
    activeContainerState === "native_visible" || activeContainerState === "native_opening" ? "native-canvas-active" : null
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="provider-shell-layout">
      <CyroLeftDrawer
        open={shellState.drawerOpen}
        onToggle={() => dispatch({ type: "toggle_drawer" })}
        onClose={() => dispatch({ type: "close_drawer" })}
      />

      <main className={mainClassName} aria-label="Cyro provider shell chat prototype">
        <ProviderHeader
          selectedProvider={shellState.selectedProvider}
          generationState={shellState.generationState}
          providerSurfaceStatus={shellState.providerSurfaceStatus}
          providerContainerState={activeContainerState}
          diagnosticsOpen={shellState.diagnosticsOpen}
          onDrawerToggle={() => dispatch({ type: "toggle_drawer" })}
          onDiagnosticsToggle={() => dispatch({ type: "toggle_diagnostics" })}
          onOpenSeparateWindow={
            activeProvider ? () => handleOpenSeparateWindowFallback(activeProvider) : undefined
          }
        />

        <ProviderTabRail
          selectedProvider={shellState.selectedProvider}
          nativeContainerStatus={nativeContainerStatus}
          onProviderChange={handleProviderChange}
        />

        <section className={stageClassName} aria-label="Provider shell stage">
          {isLocalRoute ? (
            <div className="provider-home-presence">
              <CyroPresence
                provider={shellState.selectedProvider}
                status={shellState.providerSurfaceStatus}
                generationState={shellState.generationState}
              />
              <h1>Cyro</h1>
            </div>
          ) : activeProvider ? (
            <ProviderContainerSurface
              provider={activeProvider}
              status={shellState.providerSurfaceStatus}
              containerState={activeContainerState}
              nativeContainerMessage={nativeContainerMessage[activeProvider]}
              viewportRef={providerViewportRef}
              onOpenInLayoutContainer={() => handleOpenInLayoutContainer(activeProvider)}
              onOpenSeparateWindowFallback={
                activeContainerState === "native_visible"
                  ? undefined
                  : () => handleOpenSeparateWindowFallback(activeProvider)
              }
            />
          ) : null}
        </section>

        {isLocalRoute && composerNotice ? (
          <div className="composer-notice" role="status">
            {composerNotice}
          </div>
        ) : null}

        {isLocalRoute && shellState.diagnosticsOpen ? (
          <section className="provider-diagnostics-panel" aria-label="Runtime diagnostics">
            <RuntimePanel status={runtimeStatus} onStatusRefresh={onRuntimeRefresh} />
          </section>
        ) : null}

        {isLocalRoute ? (
          <>
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
          </>
        ) : null}
      </main>
    </div>
  );
}

function providerContainerStateFromNativeStatus(status: ProviderNativeContainerStatus): ProviderContainerState {
  if (status === "native_visible") {
    return "native_visible";
  }

  if (status === "native_hidden") {
    return "native_hidden";
  }

  if (status === "separate_window_fallback") {
    return "separate_window_fallback";
  }

  if (status === "native_opening") {
    return "native_opening";
  }

  if (status === "native_failed") {
    return "native_failed";
  }

  return "idle";
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }

    setTimeout(resolve, 0);
  });
}
