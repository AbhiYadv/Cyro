import { generationControlForState, providerDisplayName, runtimeDiagnosticsMode } from "../../services/providerShell";
import type {
  ProviderShellGenerationState,
  ProviderShellReasoningMode,
  ProviderSurfaceStatus
} from "../../services/providerShell";
import type { ProviderRouteId } from "../../types/provider";

type ProviderHeaderProps = {
  selectedProvider: ProviderRouteId;
  reasoningMode: ProviderShellReasoningMode;
  generationState: ProviderShellGenerationState;
  providerSurfaceStatus: ProviderSurfaceStatus;
  diagnosticsOpen: boolean;
  onDrawerToggle: () => void;
  onDiagnosticsToggle: () => void;
};

function statusLabel(status: ProviderSurfaceStatus) {
  if (status === "blocked") {
    return "Blocked";
  }

  if (status === "unvalidated") {
    return "Unvalidated";
  }

  if (status === "fallback") {
    return "Fallback";
  }

  return "Ready";
}

export function ProviderHeader({
  selectedProvider,
  reasoningMode,
  generationState,
  providerSurfaceStatus,
  diagnosticsOpen,
  onDrawerToggle,
  onDiagnosticsToggle
}: ProviderHeaderProps) {
  const control = generationControlForState(generationState);

  return (
    <header className="provider-header">
      <button className="header-menu-button" type="button" onClick={onDrawerToggle} aria-label="Open navigation drawer">
        Menu
      </button>
      <div className="provider-header-title">
        <span>Cyro</span>
        <strong>{providerDisplayName(selectedProvider)}</strong>
      </div>
      <div className="provider-header-status" aria-label="Provider shell status">
        <span>{statusLabel(providerSurfaceStatus)}</span>
        <span>{reasoningMode}</span>
        <span>{control.intent === "stop" ? "Generating" : "Idle"}</span>
      </div>
      <button className="diagnostics-toggle" type="button" onClick={onDiagnosticsToggle}>
        Diagnostics: {runtimeDiagnosticsMode(diagnosticsOpen)}
      </button>
    </header>
  );
}
