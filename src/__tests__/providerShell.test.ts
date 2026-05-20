import { describe, expect, it } from "vitest";
import {
  defaultProviderShellState,
  generationControlForState,
  nextCyroTheme,
  normalizeProviderViewportBounds,
  providerContainerStateForRoute,
  providerShellReducer,
  providerSurfaceStatusForRoute,
  resolveCyroTheme,
  runtimeDiagnosticsMode,
  shellComposerPlaceholder,
  shellTools,
  shouldAutoOpenProvider,
  shouldSyncProviderViewportBounds
} from "../services/providerShell";

describe("provider shell state contract", () => {
  it("changes composer placeholder when selected provider changes", () => {
    const next = providerShellReducer(defaultProviderShellState, {
      type: "select_provider",
      provider: "claude"
    });

    expect(next.selectedProvider).toBe("claude");
    expect(shellComposerPlaceholder(next.selectedProvider)).toBe("Prompt bridge coming later");
  });

  it("keeps Local placeholder separate from provider bridge-pending wording", () => {
    expect(shellComposerPlaceholder("local")).toBe("Ask Local");
    expect(shellComposerPlaceholder("local")).not.toContain("Prompt bridge coming later");
    expect(shellComposerPlaceholder("chatgpt")).toBe("Prompt bridge coming later");
    expect(shellComposerPlaceholder("gemini")).toBe("Prompt bridge coming later");
  });

  it("uses provider pill state rather than raw route select behavior", () => {
    const chatgpt = providerShellReducer(defaultProviderShellState, {
      type: "select_provider",
      provider: "chatgpt"
    });
    const gemini = providerShellReducer(chatgpt, {
      type: "select_provider",
      provider: "gemini"
    });

    expect(chatgpt.selectedProvider).toBe("chatgpt");
    expect(chatgpt.providerSurfaceStatus).toBe("blocked");
    expect(gemini.selectedProvider).toBe("gemini");
    expect(gemini.providerSurfaceStatus).toBe("unvalidated");
  });

  it("changes reasoning mode through pill state", () => {
    const think = providerShellReducer(defaultProviderShellState, {
      type: "select_reasoning",
      reasoningMode: "think"
    });
    const pro = providerShellReducer(think, {
      type: "select_reasoning",
      reasoningMode: "pro"
    });

    expect(think.reasoningMode).toBe("think");
    expect(pro.reasoningMode).toBe("pro");
  });

  it("opens and closes the tools menu", () => {
    const open = providerShellReducer(defaultProviderShellState, { type: "toggle_tools" });
    const closed = providerShellReducer(open, { type: "close_tools" });

    expect(open.toolsOpen).toBe(true);
    expect(closed.toolsOpen).toBe(false);
    expect(shellTools.map((tool) => tool.label)).toEqual([
      "Attach file",
      "Use Vault",
      "Use Memory",
      "Create image",
      "Import provider answer",
      "Settings"
    ]);
  });

  it("opens and closes the left drawer", () => {
    const open = providerShellReducer(defaultProviderShellState, { type: "toggle_drawer" });
    const closed = providerShellReducer(open, { type: "close_drawer" });

    expect(open.drawerOpen).toBe(true);
    expect(closed.drawerOpen).toBe(false);
  });

  it("keeps Gemini selected when the menu is toggled", () => {
    const gemini = providerShellReducer(defaultProviderShellState, {
      type: "select_provider",
      provider: "gemini"
    });
    const menuOpen = providerShellReducer(gemini, { type: "toggle_drawer" });
    const menuClosed = providerShellReducer(menuOpen, { type: "toggle_drawer" });

    expect(menuOpen.selectedProvider).toBe("gemini");
    expect(menuOpen.providerSurfaceStatus).toBe("unvalidated");
    expect(menuClosed.selectedProvider).toBe("gemini");
  });

  it("keeps Claude selected when the menu is toggled", () => {
    const claude = providerShellReducer(defaultProviderShellState, {
      type: "select_provider",
      provider: "claude"
    });
    const menuOpen = providerShellReducer(claude, { type: "toggle_drawer" });

    expect(menuOpen.selectedProvider).toBe("claude");
    expect(menuOpen.providerSurfaceStatus).toBe("unvalidated");
  });

  it("keeps the selected provider when the drawer is closed", () => {
    const gemini = providerShellReducer(defaultProviderShellState, {
      type: "select_provider",
      provider: "gemini"
    });
    const menuOpen = providerShellReducer(gemini, { type: "toggle_drawer" });
    const closed = providerShellReducer(menuOpen, { type: "close_drawer" });

    expect(closed.drawerOpen).toBe(false);
    expect(closed.selectedProvider).toBe("gemini");
    expect(closed.providerSurfaceStatus).toBe("unvalidated");
  });

  it("renders ChatGPT as blocked because iframe feasibility failed", () => {
    expect(providerSurfaceStatusForRoute("chatgpt")).toBe("blocked");
  });

  it("renders Gemini as unvalidated until native container validation exists", () => {
    expect(providerSurfaceStatusForRoute("gemini")).toBe("unvalidated");
  });

  it("shows Send when idle", () => {
    expect(generationControlForState("idle")).toEqual({ label: "Send", intent: "send" });
  });

  it.each(["starting", "streaming", "cancelling"] as const)("shows Stop when generation state is %s", (generationState) => {
    expect(generationControlForState(generationState)).toEqual({ label: "Stop", intent: "stop" });
  });

  it("keeps runtime diagnostics compact until explicitly expanded", () => {
    expect(runtimeDiagnosticsMode(false)).toBe("compact");
    expect(runtimeDiagnosticsMode(true)).toBe("expanded");
  });

  it("auto-opens provider tabs only when the selected provider needs an in-layout native container", () => {
    expect(shouldAutoOpenProvider("local", "idle")).toBe(false);
    expect(shouldAutoOpenProvider("chatgpt", "idle")).toBe(true);
    expect(shouldAutoOpenProvider("claude", "idle")).toBe(true);
    expect(shouldAutoOpenProvider("gemini", "idle")).toBe(true);
    expect(shouldAutoOpenProvider("chatgpt", "native_opening")).toBe(false);
    expect(shouldAutoOpenProvider("chatgpt", "native_visible")).toBe(false);
    expect(shouldAutoOpenProvider("chatgpt", "native_hidden")).toBe(true);
    expect(shouldAutoOpenProvider("chatgpt", "separate_window_fallback")).toBe(false);
    expect(shouldAutoOpenProvider("chatgpt", "native_failed")).toBe(true);
  });

  it("syncs measured provider bounds only for native-visible provider routes", () => {
    const fullscreenBounds = {
      x: 62.4,
      y: 86.5,
      width: 3012.2,
      height: 1818.8
    };

    expect(normalizeProviderViewportBounds(fullscreenBounds)).toEqual({
      x: 62,
      y: 87,
      width: 3012,
      height: 1819
    });
    expect(shouldSyncProviderViewportBounds("chatgpt", "native_visible", fullscreenBounds)).toBe(true);
    expect(shouldSyncProviderViewportBounds("gemini", "native_visible", fullscreenBounds)).toBe(true);
    expect(shouldSyncProviderViewportBounds("local", "native_visible", fullscreenBounds)).toBe(false);
  });

  it("keeps provider container state keyed by provider id", () => {
    const nativeStatus = {
      chatgpt: "native_visible" as const,
      claude: "native_hidden" as const,
      gemini: "native_opening" as const
    };

    expect(providerContainerStateForRoute("local", nativeStatus)).toBe("idle");
    expect(providerContainerStateForRoute("chatgpt", nativeStatus)).toBe("native_visible");
    expect(providerContainerStateForRoute("claude", nativeStatus)).toBe("native_hidden");
    expect(providerContainerStateForRoute("gemini", nativeStatus)).toBe("native_opening");
  });

  it("does not approve stale or invalid provider bounds for resize sync", () => {
    expect(shouldSyncProviderViewportBounds("chatgpt", "native_opening", {
      x: 0,
      y: 84,
      width: 1400,
      height: 900
    })).toBe(false);
    expect(shouldSyncProviderViewportBounds("chatgpt", "native_visible", {
      x: 0,
      y: 84,
      width: 280,
      height: 900
    })).toBe(false);
    expect(shouldSyncProviderViewportBounds("claude", "native_visible", {
      x: 0,
      y: 84,
      width: Number.NaN,
      height: 900
    })).toBe(false);
    expect(normalizeProviderViewportBounds(null)).toBeNull();
  });

  it("defaults theme state to dark and toggles explicitly to light", () => {
    expect(resolveCyroTheme(null)).toBe("dark");
    expect(resolveCyroTheme("light")).toBe("light");
    expect(resolveCyroTheme("dark")).toBe("dark");
    expect(resolveCyroTheme("system")).toBe("dark");
    expect(nextCyroTheme("dark")).toBe("light");
    expect(nextCyroTheme("light")).toBe("dark");
  });
});
