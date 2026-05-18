import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CyroComposer } from "../components/provider/CyroComposer";
import { CyroLeftDrawer } from "../components/provider/CyroLeftDrawer";
import { CyroPresence } from "../components/provider/CyroPresence";
import { ProviderBlockedState } from "../components/provider/ProviderBlockedState";
import { ProviderHeader } from "../components/provider/ProviderHeader";
import { ProviderShellLayout } from "../components/provider/ProviderShellLayout";
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
  it("renders CyroPresence for the local home state", () => {
    const html = renderToString(<ProviderShellLayout runtimeStatus={runtimeStatus} onRuntimeRefresh={noopAsync} />);

    expect(html).toContain("cyro-presence");
    expect(html).toContain("Cyro is ready");
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

  it("renders ChatGPT blocked state without an iframe panel", () => {
    const html = renderToString(<ProviderBlockedState provider="chatgpt" status="blocked" />);

    expect(html).toContain("Provider shell is not validated yet.");
    expect(html).toContain("Iframe display is blocked");
    expect(html).toContain("blank or blocked iframe");
    expect(html).toContain("Iframe embedding remains a feasibility result, not the final provider-shell solution.");
    expect(html).toContain("CYRO-PROVIDER-010");
    expect(html).toContain("Tauri-native visible webview/session container");
    expect(html).toContain("Explicit fallback");
  });

  it("renders Gemini as an unvalidated route prototype with native container follow-up", () => {
    const html = renderToString(<ProviderBlockedState provider="gemini" status="unvalidated" />);

    expect(html).toContain("Provider shell is not validated yet.");
    expect(html).toContain(
      "Gemini is available as a route in the shell prototype, but manual embedded-session validation is still pending."
    );
    expect(html).toContain(
      "CYRO-PROVIDER-010 must validate a Tauri-native visible webview/session container with no DOM, cookie, credential, prompt, or response capture."
    );
    expect(html).not.toContain("Gemini session is ready");
  });

  it("labels provider header routes as container pending without changing Local", () => {
    const geminiHtml = renderToString(
      <ProviderHeader
        selectedProvider="gemini"
        reasoningMode="fast"
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
        reasoningMode="fast"
        generationState="idle"
        providerSurfaceStatus="ready"
        diagnosticsOpen={false}
        onDrawerToggle={noop}
        onDiagnosticsToggle={noop}
      />
    );

    expect(geminiHtml).toContain("Gemini route prototype");
    expect(geminiHtml).toContain("Container pending");
    expect(localHtml).toContain(">Local<");
    expect(localHtml).not.toContain("Container pending");
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
    expect(closedHtml).toContain("cyro-left-drawer");
    expect(closedHtml).not.toContain("drawer-scrim");
  });

  it("renders Send when idle and Stop while generation is active", () => {
    const baseProps = {
      selectedProvider: "gemini" as const,
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

    expect(idleHtml).toContain("Draft for Gemini route prototype");
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
    expect(html).toContain("Prototype");
    expect(html).toContain("Claude");
    expect(html).toContain("Gemini");
    expect(html).toContain("reasoning-pill active");
  });
});
