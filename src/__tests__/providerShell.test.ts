import { describe, expect, it } from "vitest";
import {
  defaultProviderShellState,
  generationControlForState,
  providerShellReducer,
  providerSurfaceStatusForRoute,
  runtimeDiagnosticsMode,
  shellComposerPlaceholder,
  shellTools
} from "../services/providerShell";

describe("provider shell state contract", () => {
  it("changes composer placeholder when selected provider changes", () => {
    const next = providerShellReducer(defaultProviderShellState, {
      type: "select_provider",
      provider: "claude"
    });

    expect(next.selectedProvider).toBe("claude");
    expect(shellComposerPlaceholder(next.selectedProvider)).toBe("Draft for Claude route prototype");
  });

  it("keeps Local placeholder separate from provider validation wording", () => {
    expect(shellComposerPlaceholder("local")).toBe("Ask Local");
    expect(shellComposerPlaceholder("local")).not.toContain("route prototype");
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
});
