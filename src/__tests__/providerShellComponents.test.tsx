import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "../app/App";
import { CyroComposer } from "../components/provider/CyroComposer";
import { CyroLeftDrawer } from "../components/provider/CyroLeftDrawer";
import { CyroPresence } from "../components/provider/CyroPresence";
import { ProviderBlockedState } from "../components/provider/ProviderBlockedState";
import { ProviderContainerSurface } from "../components/provider/ProviderContainerSurface";
import { ProviderNativeCanvas } from "../components/provider/ProviderNativeCanvas";
import { ProviderHeader } from "../components/provider/ProviderHeader";
import { ProviderShellLayout } from "../components/provider/ProviderShellLayout";
import { ProviderTabRail } from "../components/provider/ProviderTabRail";
import { ProviderToolsMenu } from "../components/provider/ProviderToolsMenu";
import type { RuntimeStatus } from "../types/runtime";

const noop = () => undefined;
const noopAsync = async () => runtimeStatus;

const runtimeStatus: RuntimeStatus = {
  health: "ok",
  modelLoaded: false,
  modelName: null,
  mode: "fast",
  runtimeState: "not_configured",
  activeRoute: "local_mock",
  routeExplanation: "Local Brain is not configured. Cyro will use the local mock fallback.",
  backendMode: "auto",
  cpuFallbackActive: false,
  sidecar: {
    state: "not_configured",
    binaryKind: null,
    path: null,
    version: null,
    message: "No sidecar configured.",
    recoverable: true,
    userAction: "Configure a local sidecar.",
    lastCheckedAt: null
  },
  localModel: null,
  modelRegistry: [],
  benchmark: {
    status: "not_run",
    latestResult: null,
    message: "Benchmark has not run."
  },
  generationState: "idle",
  activeGenerationId: null,
  lastFinishReason: null,
  lastError: null,
  network: "disabled",
  vault: "not_indexed",
  memory: "local_only",
  sync: "disabled",
  privacy: "offline"
};

describe("provider shell components", () => {
  it("uses the provider shell as the active app entrypoint", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Cyro provider shell chat prototype");
    expect(html).toContain("Provider route");
    expect(html).not.toContain("SOVEREIGN GPT");
    expect(html).not.toContain("Cyro Local Brain is online in Sprint 0 shell mode");
    expect(html).not.toContain("Cyro is ready");
  });

  it("renders CyroPresence and minimal Cyro heading for the local home state", () => {
    const html = renderToString(<ProviderShellLayout runtimeStatus={runtimeStatus} onRuntimeRefresh={noopAsync} />);

    expect(html).toContain("provider-shell-main local-mode");
    expect(html).toContain("cyro-presence");
    expect(html).toContain("cyro-composer-shell");
    expect(html).toContain(">Cyro<");
    expect(html).not.toContain("Cyro is ready");
  });

  it("does not require the old verbose home headline or feature chips", () => {
    const html = renderToString(<ProviderShellLayout runtimeStatus={runtimeStatus} onRuntimeRefresh={noopAsync} />);

    expect(html).not.toContain("What should Cyro help prepare?");
    expect(html).not.toContain("One composer routes work");
    expect(html).not.toContain("Prepare context capsule");
  });

  it("renders the Cyro-owned animated presence visual", () => {
    const html = renderToString(<CyroPresence provider="local" status="ready" generationState="idle" />);

    expect(html).toContain("aria-label=\"Cyro Presence\"");
    expect(html).toContain("cyro-presence-core");
    expect(html).not.toContain("OpenHuman");
  });

  it("renders ChatGPT blocked state with softened copy and no iframe panel", () => {
    const html = renderToString(
      <ProviderBlockedState
        provider="chatgpt"
        status="blocked"
        containerState="iframe_blocked"
        onOpenInLayoutContainer={noop}
        onOpenSeparateWindowFallback={noop}
      />
    );

    expect(html).toContain("Open");
    expect(html).toContain("ChatGPT");
    expect(html).toContain("in Cyro.");
    expect(html).not.toContain("Provider shell is not validated yet.");
    expect(html).toContain("Provider-owned content opens inside Cyro.");
    expect(html).toContain("Cyro cannot read DOM, cookies, credentials, prompts, or responses.");
    expect(html).toContain("Iframe embedding is blocked");
    expect(html).toContain("Open in Cyro");
    expect(html).toContain("Open separate window");
    expect(html).not.toContain("Explicit fallback");
    expect(html).not.toContain("CYRO-PROVIDER-011");
  });

  it("renders Gemini as pending with softened copy", () => {
    const html = renderToString(<ProviderBlockedState provider="gemini" status="unvalidated" />);

    expect(html).toContain("Open");
    expect(html).toContain("Gemini");
    expect(html).toContain("in Cyro.");
    expect(html).not.toContain("Provider shell is not validated yet.");
    expect(html).toContain("Provider-owned content opens inside Cyro.");
    expect(html).toContain("Native provider session validation is pending for this route.");
    expect(html).not.toContain("Gemini session is ready");
  });

  it("renders in-layout and separate-window provider container states distinctly", () => {
    const inLayoutHtml = renderToString(
      <ProviderContainerSurface
        provider="claude"
        status="unvalidated"
        containerState="native_visible"
        nativeContainerMessage="Claude in-layout native provider webview opened inside the main Cyro window."
      />
    );
    const fallbackHtml = renderToString(
      <ProviderContainerSurface
        provider="claude"
        status="unvalidated"
        containerState="separate_window_fallback"
        nativeContainerMessage="Claude separate native provider window opened as fallback only."
        onOpenSeparateWindowFallback={noop}
      />
    );

    expect(inLayoutHtml).toContain("provider-native-canvas");
    expect(inLayoutHtml).toContain("Protected provider session");
    expect(inLayoutHtml).not.toContain("Provider-owned session — Cyro cannot read this content.");
    expect(inLayoutHtml).not.toContain("Native provider webview reserved region");
    expect(inLayoutHtml).not.toContain("inside the main Cyro window");
    expect(inLayoutHtml).not.toContain("cyro-composer-shell");
    expect(inLayoutHtml).not.toContain("composer-send-button");
    expect(inLayoutHtml).not.toContain("Open Claude in Cyro.");
    expect(inLayoutHtml).not.toContain("Provider shell is not validated yet.");
    expect(inLayoutHtml).not.toContain("Iframe display is blocked.");
    expect(inLayoutHtml).not.toContain("Live");
    expect(fallbackHtml).toContain("Open separate window");
    expect(fallbackHtml).toContain("fallback only");
  });

  it("renders native provider canvas for native_visible state", () => {
    const html = renderToString(
      <ProviderNativeCanvas
        provider="chatgpt"
        containerState="native_visible"
      />
    );

    expect(html).toContain("provider-native-canvas");
    expect(html).toContain("provider-native-canvas-lock");
    expect(html).toContain("ChatGPT");
    expect(html).toContain("Protected provider session");
    expect(html).not.toContain("Provider-owned session — Cyro cannot read this content.");
    expect(html).not.toContain("Native provider webview reserved region");
    expect(html).not.toContain("native provider webview opened inside the main Cyro window");
    expect(html).not.toContain("Login and session persistence are not validated.");
    expect(html).not.toContain("Live");
  });

  it("renders iframe blocked card only for iframe_blocked state and not native_visible", () => {
    const blockedHtml = renderToString(
      <ProviderContainerSurface
        provider="chatgpt"
        status="blocked"
        containerState="iframe_blocked"
        onOpenInLayoutContainer={noop}
        onOpenSeparateWindowFallback={noop}
      />
    );
    const nativeHtml = renderToString(
      <ProviderContainerSurface
        provider="chatgpt"
        status="blocked"
        containerState="native_visible"
        nativeContainerMessage="ChatGPT native provider webview opened inside the main Cyro window."
      />
    );

    expect(blockedHtml).toContain("Iframe embedding is blocked");
    expect(blockedHtml).toContain("Open");
    expect(blockedHtml).toContain("ChatGPT");
    expect(blockedHtml).toContain("in Cyro.");
    expect(nativeHtml).toContain("provider-native-canvas");
    expect(nativeHtml).not.toContain("cyro-composer-shell");
    expect(nativeHtml).not.toContain("composer-send-button");
    expect(nativeHtml).toContain("Protected provider session");
    expect(nativeHtml).not.toContain("Native provider webview reserved region");
    expect(nativeHtml).not.toContain("Iframe display is blocked.");
    expect(nativeHtml).not.toContain("Open ChatGPT in Cyro.");
    expect(nativeHtml).not.toContain("blank or blocked iframe");
  });

  it("labels provider header routes as container pending without changing Local", () => {
    const geminiHtml = renderToString(
      <ProviderHeader
        selectedProvider="gemini"
        generationState="idle"
        providerSurfaceStatus="unvalidated"
        diagnosticsOpen={false}
        onDrawerToggle={noop}
        onDiagnosticsToggle={noop}
      />
    );
    const localHtml = renderToString(
      <ProviderHeader
        selectedProvider="local"
        generationState="idle"
        providerSurfaceStatus="ready"
        diagnosticsOpen={false}
        onDrawerToggle={noop}
        onDiagnosticsToggle={noop}
      />
    );

    expect(geminiHtml).toContain(">Gemini<");
    expect(geminiHtml).toContain("hamburger-icon");
    expect(geminiHtml).toContain("aria-label=\"Open navigation drawer\"");
    expect(geminiHtml).not.toContain("route prototype");
    expect(geminiHtml).not.toContain("Live");
    expect(geminiHtml).not.toContain(">Menu<");
    expect(geminiHtml).not.toContain(">Diag<");
    expect(geminiHtml).not.toContain("Container pending");
    expect(geminiHtml).not.toContain("Blocked iframe");
    expect(localHtml).toContain(">Cyro<");
    expect(localHtml).not.toContain("Container pending");
  });

  it("keeps provider header minimal when the child container is attached", () => {
    const html = renderToString(
      <ProviderHeader
        selectedProvider="chatgpt"
        generationState="idle"
        providerSurfaceStatus="blocked"
        providerContainerState="native_visible"
        diagnosticsOpen={false}
        onDrawerToggle={noop}
        onDiagnosticsToggle={noop}
        onOpenSeparateWindow={noop}
      />
    );

    expect(html).toContain(">ChatGPT<");
    expect(html).toContain("aria-label=\"Open in separate window\"");
    expect(html).not.toContain("route prototype");
    expect(html).not.toContain("Native visible");
    expect(html).not.toContain("Blocked iframe");
    expect(html).not.toContain(">Menu<");
    expect(html).not.toContain(">Diag<");
    expect(html).not.toContain("Live");
  });

  it("renders the tools sheet when opened", () => {
    const html = renderToString(<ProviderToolsMenu open onClose={noop} />);

    expect(html).toContain("Provider shell tools");
    expect(html).toContain("Attach file");
    expect(html).toContain("Use Vault");
    expect(html).toContain("Import provider answer");
  });

  it("renders the drawer in open and closed states", () => {
    const openHtml = renderToString(<CyroLeftDrawer open onToggle={noop} onClose={noop} />);
    const closedHtml = renderToString(<CyroLeftDrawer open={false} onToggle={noop} onClose={noop} />);

    expect(openHtml).toContain("cyro-left-drawer open");
    expect(openHtml).toContain("Search chats");
    expect(openHtml).toContain("Provider sessions");
    expect(openHtml).not.toContain("Shell only");
    expect(openHtml).not.toContain(">Menu<");
    expect(openHtml).not.toContain(">Close<");
    expect(closedHtml).toContain("cyro-left-drawer");
    expect(closedHtml).not.toContain("drawer-scrim");
    expect(closedHtml).not.toContain(">Menu<");
  });

  it("renders Send when Local is idle and Stop while Local generation is active", () => {
    const baseProps = {
      selectedProvider: "local" as const,
      reasoningMode: "pro" as const,
      toolsOpen: false,
      prompt: "",
      onPromptChange: noop,
      onProviderChange: noop,
      onReasoningChange: noop,
      onToolsToggle: noop,
      onToolsClose: noop,
      onSend: noop,
      onStop: noop
    };

    const idleHtml = renderToString(<CyroComposer {...baseProps} generationState="idle" />);
    const streamingHtml = renderToString(<CyroComposer {...baseProps} generationState="streaming" />);

    expect(idleHtml).toContain("Ask Local");
    expect(idleHtml).toContain("Send");
    expect(streamingHtml).toContain("Stop");
  });

  it("renders provider and reasoning pill selectors instead of raw selects", () => {
    const html = renderToString(
      <CyroComposer
        selectedProvider="chatgpt"
        reasoningMode="think"
        generationState="idle"
        toolsOpen={false}
        prompt=""
        onPromptChange={noop}
        onProviderChange={noop}
        onReasoningChange={noop}
        onToolsToggle={noop}
        onToolsClose={noop}
        onSend={noop}
        onStop={noop}
      />
    );

    expect(html).not.toContain("<select");
    expect(html).not.toContain("<option");
    expect(html).toContain("provider-pill active");
    expect(html).toContain("Local");
    expect(html).toContain("ChatGPT");
    expect(html).toContain("Claude");
    expect(html).toContain("Gemini");
    expect(html).not.toContain("Prototype");
    expect(html).not.toContain("Blocked");
    expect(html).not.toContain("reasoning-pill active");
  });

  it("renders provider tab rail with compact routes and no loud status chips", () => {
    const nativeStatus = { chatgpt: "iframe_blocked" as const, claude: "idle" as const, gemini: "idle" as const };
    const html = renderToString(
      <ProviderTabRail selectedProvider="local" nativeContainerStatus={nativeStatus} onProviderChange={noop} />
    );

    expect(html).toContain("provider-tab-rail");
    expect(html).toContain("Local");
    expect(html).toContain("ChatGPT");
    expect(html).toContain("Claude");
    expect(html).toContain("Gemini");
    expect(html).not.toContain("provider-tab-chip");
    expect(html).not.toContain("READY");
    expect(html).not.toContain("Blocked");
    expect(html).not.toContain("Pending");
  });

  it("marks the active provider tab with aria-selected and active class", () => {
    const nativeStatus = { chatgpt: "iframe_blocked" as const, claude: "idle" as const, gemini: "idle" as const };

    const localHtml = renderToString(
      <ProviderTabRail selectedProvider="local" nativeContainerStatus={nativeStatus} onProviderChange={noop} />
    );
    const chatgptHtml = renderToString(
      <ProviderTabRail selectedProvider="chatgpt" nativeContainerStatus={nativeStatus} onProviderChange={noop} />
    );

    expect(localHtml).toContain("provider-tab active");
    expect(chatgptHtml).toContain("provider-tab active");
  });

  it("keeps native-visible tab state subtle without a loud visible chip", () => {
    const nativeStatus = { chatgpt: "native_visible" as const, claude: "idle" as const, gemini: "idle" as const };
    const html = renderToString(
      <ProviderTabRail selectedProvider="chatgpt" nativeContainerStatus={nativeStatus} onProviderChange={noop} />
    );

    expect(html).toContain("provider-tab-state-dot native_visible");
    expect(html).not.toContain("provider-tab-chip");
    expect(html).not.toContain("Native visible");
    expect(html).not.toContain("Live");
  });

  it("enables the Local composer textarea", () => {
    const baseProps = {
      reasoningMode: "fast" as const,
      generationState: "idle" as const,
      toolsOpen: false,
      prompt: "",
      onPromptChange: noop,
      onProviderChange: noop,
      onReasoningChange: noop,
      onToolsToggle: noop,
      onToolsClose: noop,
      onSend: noop,
      onStop: noop
    };

    const localHtml = renderToString(<CyroComposer {...baseProps} selectedProvider="local" />);

    expect(localHtml).toContain("Ask Local");
    expect(localHtml).not.toContain("disabled");
    expect(localHtml).not.toContain("bridge-pending");
  });

  it("disables the provider composer textarea and shows bridge-pending state", () => {
    const baseProps = {
      reasoningMode: "fast" as const,
      generationState: "idle" as const,
      toolsOpen: false,
      prompt: "",
      onPromptChange: noop,
      onProviderChange: noop,
      onReasoningChange: noop,
      onToolsToggle: noop,
      onToolsClose: noop,
      onSend: noop,
      onStop: noop
    };

    const chatgptHtml = renderToString(<CyroComposer {...baseProps} selectedProvider="chatgpt" />);
    const geminiHtml = renderToString(<CyroComposer {...baseProps} selectedProvider="gemini" />);

    expect(chatgptHtml).toContain("bridge-pending");
    expect(chatgptHtml).toContain("Prompt bridge coming later");
    expect(chatgptHtml).toContain("use the provider box inside the session");
    expect(chatgptHtml).toContain("disabled");
    expect(chatgptHtml).not.toContain("composer-send-button");
    expect(chatgptHtml).not.toContain(">Send<");
    expect(chatgptHtml).not.toContain("reasoning-selector");
    expect(chatgptHtml).not.toContain(">Fast<");
    expect(chatgptHtml).not.toContain(">Think<");
    expect(chatgptHtml).not.toContain(">Pro<");
    expect(geminiHtml).toContain("bridge-pending");
    expect(geminiHtml).toContain("Prompt bridge coming later");
  });

  it("does not claim provider login, chat, or session is validated for any provider route", () => {
    const nativeStatus = { chatgpt: "native_visible" as const, claude: "idle" as const, gemini: "idle" as const };
    const tabHtml = renderToString(
      <ProviderTabRail selectedProvider="chatgpt" nativeContainerStatus={nativeStatus} onProviderChange={noop} />
    );
    const canvasHtml = renderToString(
      <ProviderNativeCanvas provider="chatgpt" containerState="native_visible" />
    );

    expect(tabHtml).not.toContain("session validated");
    expect(tabHtml).not.toContain("login");
    expect(canvasHtml).not.toContain("session validated");
    expect(canvasHtml).not.toContain("login");
  });

  it("renders dark provider viewport loading state when native container is opening", () => {
    const html = renderToString(
      <ProviderContainerSurface provider="chatgpt" status="blocked" containerState="native_opening" />
    );

    expect(html).toContain("provider-native-canvas");
    expect(html).toContain("provider-native-loading");
    expect(html).toContain("Opening provider session…");
    expect(html).toContain("Protected provider session");
    expect(html).not.toContain("Opening native provider session…");
    expect(html).not.toContain("No DOM, cookie, credential, prompt, or response capture.");
    expect(html).not.toContain("Native provider session pending.");
    expect(html).not.toContain("Open in-layout container");
    expect(html).not.toContain("Retry native session");
  });

  it("renders retry button when native container has failed", () => {
    const html = renderToString(
      <ProviderBlockedState
        provider="chatgpt"
        status="blocked"
        containerState="native_failed"
        onOpenInLayoutContainer={noop}
      />
    );

    expect(html).toContain("Retry in Cyro");
    expect(html).not.toContain("Open in-layout container");
    expect(html).not.toContain("Opening native provider session");
  });

  it("renders separate window as an icon action in the provider header", () => {
    const html = renderToString(
      <ProviderHeader
        selectedProvider="chatgpt"
        generationState="idle"
        providerSurfaceStatus="blocked"
        providerContainerState="native_visible"
        diagnosticsOpen={false}
        onDrawerToggle={noop}
        onDiagnosticsToggle={noop}
        onOpenSeparateWindow={noop}
      />
    );

    expect(html).toContain("provider-open-window-button");
    expect(html).toContain("aria-label=\"Open in separate window\"");
    expect(html).not.toContain(">Open in separate window<");
  });

  it("does not render pending card or text action for native visible container surface", () => {
    const html = renderToString(
      <ProviderContainerSurface
        provider="chatgpt"
        status="blocked"
        containerState="native_visible"
        onOpenSeparateWindowFallback={noop}
      />
    );

    expect(html).toContain("provider-native-canvas");
    expect(html).toContain("Protected provider session");
    expect(html).not.toContain("Provider-owned session — Cyro cannot read this content.");
    expect(html).not.toContain("Open in separate window");
    expect(html).not.toContain("Open ChatGPT in Cyro.");
  });

  it("does not render a full provider-owned banner sentence on native canvas", () => {
    const html = renderToString(
      <ProviderNativeCanvas provider="chatgpt" containerState="native_visible" />
    );

    expect(html).toContain("Protected provider session");
    expect(html).not.toContain("Provider-owned session — Cyro cannot read this content.");
    expect(html).not.toContain("Open in separate window");
    expect(html).not.toContain("provider-canvas-external-action");
  });

  it("does not render reasoning mode or Idle in provider header", () => {
    const html = renderToString(
      <ProviderHeader
        selectedProvider="claude"
        generationState="idle"
        providerSurfaceStatus="unvalidated"
        diagnosticsOpen={false}
        onDrawerToggle={noop}
        onDiagnosticsToggle={noop}
      />
    );

    expect(html).not.toContain(">fast<");
    expect(html).not.toContain(">think<");
    expect(html).not.toContain(">pro<");
    expect(html).not.toContain(">Idle<");
    expect(html).not.toContain("route prototype");
    expect(html).not.toContain("Live");
    expect(html).not.toContain(">Menu<");
    expect(html).not.toContain(">Diag<");
    expect(html).toContain(">Claude<");
  });
});
