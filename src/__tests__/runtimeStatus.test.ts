import { describe, expect, it } from "vitest";
import {
  composeActionableMessage,
  formatModelFile,
  isLocalRuntimeReady,
  routeLabel,
  runtimeStateLabel
} from "../services/runtimeStatus";
import { placeholderModelRegistry } from "../services/modelRegistry";
import { mockedSidecarStatus } from "../services/sidecar";
import type { RuntimeStatus } from "../types/runtime";

function status(overrides: Partial<RuntimeStatus> = {}): RuntimeStatus {
  return {
    health: "ok",
    modelLoaded: false,
    modelName: null,
    mode: "fast",
    runtimeState: "not_configured",
    activeRoute: "local_mock",
    routeExplanation: "Local Brain is not configured. Cyro will use the local mock fallback.",
    sidecar: mockedSidecarStatus,
    localModel: placeholderModelRegistry[0],
    modelRegistry: placeholderModelRegistry,
    lastError: null,
    network: "disabled",
    vault: "not_indexed",
    memory: "local_only",
    sync: "disabled",
    privacy: "offline",
    ...overrides
  };
}

describe("runtime status presentation helpers", () => {
  it("labels not-configured mock fallback status", () => {
    const current = status();

    expect(runtimeStateLabel(current.runtimeState)).toBe("Not Configured");
    expect(routeLabel(current.activeRoute)).toBe("Local Mock");
    expect(isLocalRuntimeReady(current)).toBe(false);
  });

  it("detects ready local sidecar status", () => {
    const current = status({
      runtimeState: "ready",
      activeRoute: "local_sidecar"
    });

    expect(runtimeStateLabel(current.runtimeState)).toBe("Ready");
    expect(routeLabel(current.activeRoute)).toBe("Local Sidecar");
    expect(isLocalRuntimeReady(current)).toBe(true);
  });

  it("formats validated model filename and actionable errors", () => {
    expect(
      formatModelFile({
        ...placeholderModelRegistry[0],
        fileName: "qwen-test.gguf",
        fileSizeMb: 512.1234,
        installed: true,
        validated: true
      })
    ).toBe("qwen-test.gguf (512.12 MB)");

    expect(composeActionableMessage("Model path does not exist.", "Select an existing local .gguf file.")).toBe(
      "Model path does not exist. Select an existing local .gguf file."
    );
  });
});
