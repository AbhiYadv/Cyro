import type { ModelRegistryEntry } from "../types/modelRegistry";
import type { RuntimeRoute, RuntimeState, RuntimeStatus } from "../types/runtime";

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

export function routeExplanation(status: RuntimeStatus) {
  if (status.activeRoute === "local_sidecar") {
    return "Local GGUF sidecar route";
  }

  return "Mock fallback";
}

export function isLocalRuntimeReady(status: RuntimeStatus) {
  return status.runtimeState === "ready" && status.activeRoute === "local_sidecar";
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
