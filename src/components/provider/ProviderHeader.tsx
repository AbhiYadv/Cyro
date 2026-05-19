import { providerHeaderRouteLabel } from "../../services/providerShell";
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
  onOpenSeparateWindow?: () => void;
};

export function ProviderHeader({
  selectedProvider,
  generationState,
  providerSurfaceStatus,
  providerContainerState = "idle",
  diagnosticsOpen,
  onDrawerToggle,
  onDiagnosticsToggle,
  onOpenSeparateWindow
}: ProviderHeaderProps) {
  const isProviderRoute = selectedProvider !== "local";
  const title = isProviderRoute ? providerHeaderRouteLabel(selectedProvider) : "Cyro";

  return (
    <header className={isProviderRoute ? "provider-header provider-header-provider-mode" : "provider-header"}>
      <button className="header-menu-button" type="button" onClick={onDrawerToggle} aria-label="Open navigation drawer">
        <span className="hamburger-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
      <div className="provider-header-title">
        <strong>{title}</strong>
      </div>
      <div className="provider-header-actions">
        {isProviderRoute && onOpenSeparateWindow ? (
          <button
            className="provider-open-window-button"
            type="button"
            onClick={onOpenSeparateWindow}
            aria-label="Open in separate window"
            title="Open in separate window"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false">
              <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h7.5A1.75 1.75 0 0 1 17 4.75v7.5A1.75 1.75 0 0 1 15.25 14H13.5v-1.5h1.75a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25h-7.5a.25.25 0 0 0-.25.25V6.5H6V4.75Z" />
              <path d="M3 7.75A1.75 1.75 0 0 1 4.75 6h7.5A1.75 1.75 0 0 1 14 7.75v7.5A1.75 1.75 0 0 1 12.25 17h-7.5A1.75 1.75 0 0 1 3 15.25v-7.5Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .14.11.25.25.25h7.5c.14 0 .25-.11.25-.25v-7.5a.25.25 0 0 0-.25-.25h-7.5Z" />
            </svg>
          </button>
        ) : (
          <button
            className="diagnostics-toggle"
            type="button"
            onClick={onDiagnosticsToggle}
            aria-label={diagnosticsOpen ? "Collapse diagnostics" : "Open diagnostics"}
          >
            <span className="diagnostics-dot-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
