import { describe, expect, it } from "vitest";
import {
  benchmarkStatusLabel,
  backendModeLabel,
  composeActionableMessage,
  formatBenchmarkElapsed,
  formatBenchmarkTokens,
  formatModelFile,
  finishReasonLabel,
  generationStateLabel,
  isBenchmarkRunnable,
  isLocalRuntimeReady,
  latencyClassLabel,
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
    backendMode: "auto",
    cpuFallbackActive: false,
    sidecar: mockedSidecarStatus,
    localModel: placeholderModelRegistry[0],
    modelRegistry: placeholderModelRegistry,
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
    privacy: "offline",
    ...overrides
  };
}

describe("runtime status presentation helpers", () => {
  it("labels not-configured mock fallback status", () => {
    const current = status();

    expect(runtimeStateLabel(current.runtimeState)).toBe("Not Configured");
    expect(generationStateLabel(current.generationState)).toBe("Idle");
    expect(finishReasonLabel(current.lastFinishReason)).toBe("None");
    expect(routeLabel(current.activeRoute)).toBe("Local Mock");
    expect(isLocalRuntimeReady(current)).toBe(false);
    expect(isBenchmarkRunnable(current)).toBe(false);
  });

  it("labels streaming generation state", () => {
    const current = status({
      runtimeState: "generating",
      generationState: "streaming",
      activeGenerationId: "generation:1",
      lastFinishReason: "completed"
    });

    expect(runtimeStateLabel(current.runtimeState)).toBe("Generating");
    expect(generationStateLabel(current.generationState)).toBe("Streaming");
    expect(finishReasonLabel(current.lastFinishReason)).toBe("Completed");
  });

  it("detects ready local sidecar status", () => {
    const current = status({
      runtimeState: "ready",
      activeRoute: "local_sidecar"
    });

    expect(runtimeStateLabel(current.runtimeState)).toBe("Ready");
    expect(routeLabel(current.activeRoute)).toBe("Local Sidecar");
    expect(isLocalRuntimeReady(current)).toBe(true);
    expect(isBenchmarkRunnable(current)).toBe(true);
  });

  it("labels backend mode and CPU fallback state", () => {
    expect(backendModeLabel("auto")).toBe("Auto");
    expect(backendModeLabel("cpu")).toBe("CPU Fallback");
    expect(backendModeLabel("auto", true)).toBe("CPU Fallback");
  });

  it("labels benchmark states and formats latest benchmark result", () => {
    const current = status({
      runtimeState: "ready",
      activeRoute: "local_sidecar",
      benchmark: {
        status: "passed",
        message: "Benchmark passed.",
        latestResult: {
          benchmarkId: "benchmark:1:qwen-0_8b-local",
          status: "passed",
          modelId: "qwen-0_8b-local",
          modelFileName: "qwen-test.gguf",
          modelFileSizeMb: 512,
          route: "local_sidecar",
          mode: "fast",
          elapsedMs: 11_000,
          tokensPerSecondOptional: 4.2,
          latencyClass: "acceptable",
          passed: true,
          reason: "Benchmark passed.",
          createdAt: "unix:1"
        }
      }
    });

    expect(benchmarkStatusLabel(current.benchmark.status)).toBe("Passed");
    expect(latencyClassLabel(current.benchmark.latestResult?.latencyClass ?? "unknown")).toBe("Acceptable");
    expect(formatBenchmarkElapsed(current.benchmark.latestResult)).toBe("11000 ms");
    expect(formatBenchmarkTokens(current.benchmark.latestResult)).toBe("4.2 token-ish/sec");
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
