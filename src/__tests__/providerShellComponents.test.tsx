import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CyroComposer } from "../components/provider/CyroComposer";
import { CyroLeftDrawer } from "../components/provider/CyroLeftDrawer";
import { ProviderBlockedState } from "../components/provider/ProviderBlockedState";
import { ProviderToolsMenu } from "../components/provider/ProviderToolsMenu";

const noop = () => undefined;

describe("provider shell components", () => {
  it("renders ChatGPT blocked state without an iframe panel", () => {
    const html = renderToString(<ProviderBlockedState provider="chatgpt" status="blocked" />);

    expect(html).toContain("Iframe display is blocked");
    expect(html).toContain("blank or blocked iframe");
    expect(html).toContain("Tauri-native visible webview/session container");
    expect(html).toContain("Explicit fallback");
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

    expect(idleHtml).toContain("Ask Gemini");
    expect(idleHtml).toContain("Send");
    expect(streamingHtml).toContain("Stop");
  });
});
