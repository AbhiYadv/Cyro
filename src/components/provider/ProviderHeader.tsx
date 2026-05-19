import {
  generationControlForState,
  providerHeaderRouteLabel,
  runtimeDiagnosticsMode
} from "../../services/providerShell";
import type {
  ProviderShellGenerationState,
  ProviderSurfaceStatus
} from "../../services/providerShell";
import type { ProviderContainerState, ProviderRouteId } from "../../types/provider";

type ProviderHeaderProps = {
  selectedProvider: ProviderRouteId;
  generationState: ProviderShellGenerationState;
  providerSurfaceStatus: ProviderSurfaceStatus;
  providerContainerState?: ProviderContainerState;
  diagnosticsOpen: boolean;
  onDrawerToggle: () => void;
  onDiagnosticsToggle: () => void;
};

export function ProviderHeader({
  selectedProvider,
  generationState,
  providerSurfaceStatus,
  providerContainerState = "idle",
  diagnosticsOpen,
  onDrawerToggle,
  onDiagnosticsToggle
}: ProviderHeaderProps) {
  const control = generationControlForState(generationState);
  const statusLabel = providerHeaderStatusLabel(providerSurfaceStatus, providerContainerState);

  return (
    <header className="provider-header">
      <button className="header-menu-button" type="button" onClick={onDrawerToggle} aria-label="Open navigation drawer">
        Menu
      </button>
      <div className="provider-header-title">
        <span>Cyro</span>
        <strong>{providerHeaderRouteLabel(selectedProvider)}</strong>
      </div>
      {statusLabel || control.intent === "stop" ? (
        <div className="provider-header-status" aria-label="Provider shell status">
          {statusLabel ? <span>{statusLabel}</span> : null}
          {control.intent === "stop" ? <span>Generating</span> : null}
        </div>
      ) : null}
      <button className="diagnostics-toggle" type="button" onClick={onDiagnosticsToggle}>
        Diagnostics {runtimeDiagnosticsMode(diagnosticsOpen)}
      </button>
    </header>
  );
}

function providerHeaderStatusLabel(
  providerSurfaceStatus: ProviderSurfaceStatus,
  providerContainerState: ProviderContainerState
) {
  if (providerContainerState === "native_visible") {
    return "Native visible";
  }

  if (providerContainerState === "native_opening") {
    return "Opening";
  }

  if (providerContainerState === "native_failed") {
    return "Native failed";
  }

  if (providerContainerState === "separate_window_fallback") {
    return "Fallback";
  }

  if (providerSurfaceStatus === "fallback") {
    return "Fallback";
  }

  return null;
}
