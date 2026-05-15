import type { ModelRegistryEntry } from "../types/modelRegistry";
import type { BenchmarkStatus, LatencyClass, RuntimeBenchmarkResult, RuntimeRoute, RuntimeState, RuntimeStatus } from "../types/runtime";

export function runtimeStateLabel(state: RuntimeState) {
  const labels: Record<RuntimeState, string> = {
    not_configured: "Not Configured",
    sidecar_ready: "Sidecar Ready",
    model_valid: "Model Valid",
    ready: "Ready",
    generating: "Generating",
    error: "Error"
  };

  return labels[state];
}

export function routeLabel(route: RuntimeRoute) {
  if (route === "local_sidecar") {
    return "Local Sidecar";
  }

  return "Local Mock";
}

export function benchmarkStatusLabel(status: BenchmarkStatus) {
  const labels: Record<BenchmarkStatus, string> = {
    not_run: "Not Run",
    running: "Running",
    passed: "Passed",
    slow: "Slow",
    failed: "Failed",
    blocked: "Blocked"
  };

  return labels[status];
}

export function latencyClassLabel(latencyClass: LatencyClass) {
  const labels: Record<LatencyClass, string> = {
    fast: "Fast",
    acceptable: "Acceptable",
    slow: "Slow",
    blocked: "Blocked",
    unknown: "Unknown"
  };

  return labels[latencyClass];
}

export function routeExplanation(status: RuntimeStatus) {
  if (status.activeRoute === "local_sidecar") {
    return "Local GGUF sidecar route";
  }

  return "Mock fallback";
}

export function isLocalRuntimeReady(status: RuntimeStatus) {
  return status.runtimeState === "ready" && status.activeRoute === "local_sidecar";
}

export function isBenchmarkRunnable(status: RuntimeStatus) {
  return isLocalRuntimeReady(status) && status.benchmark.status !== "running";
}

export function formatBenchmarkElapsed(result?: RuntimeBenchmarkResult | null) {
  if (!result) {
    return "Not measured";
  }

  return `${result.elapsedMs} ms`;
}

export function formatBenchmarkTokens(result?: RuntimeBenchmarkResult | null) {
  if (!result || typeof result.tokensPerSecondOptional !== "number") {
    return "Not estimated";
  }

  return `${result.tokensPerSecondOptional.toFixed(1)} token-ish/sec`;
}

export function formatModelFile(entry?: ModelRegistryEntry | null) {
  if (!entry?.fileName) {
    return "No GGUF selected";
  }

  if (typeof entry.fileSizeMb === "number") {
    return `${entry.fileName} (${entry.fileSizeMb.toFixed(2)} MB)`;
  }

  return entry.fileName;
}

export function composeActionableMessage(message: string, userAction?: string | null) {
  return userAction ? `${message} ${userAction}` : message;
}
