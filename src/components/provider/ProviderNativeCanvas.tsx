import type { Ref } from "react";
import type { ProviderContainerState, ProviderRouteId } from "../../types/provider";
import { providerDisplayName } from "../../services/providerShell";

type ProviderNativeCanvasProps = {
  provider: ProviderRouteId;
  containerState: ProviderContainerState;
  loading?: boolean;
  viewportRef?: Ref<HTMLDivElement>;
  onGoHome?: () => void;
  onReload?: () => void;
  manualImportOpen?: boolean;
  onManualImport?: () => void;
};

export function ProviderNativeCanvas({
  provider,
  loading = false,
  viewportRef,
  onGoHome,
  onReload,
  manualImportOpen = false,
  onManualImport
}: ProviderNativeCanvasProps) {
  const providerName = providerDisplayName(provider);

  return (
    <article className="provider-native-canvas" aria-label={`${providerName} native provider canvas`}>
      <div className="provider-browser-toolbar" aria-label={`${providerName} browser controls`}>
        <div className="provider-browser-controls">
          <button
            className="provider-browser-control"
            type="button"
            aria-label="Back"
            title="Back unavailable until native history state is exposed"
            disabled
          >
            <span className="provider-browser-icon provider-browser-icon-back" aria-hidden="true" />
          </button>
          <button
            className="provider-browser-control"
            type="button"
            aria-label="Forward"
            title="Forward unavailable until native history state is exposed"
            disabled
          >
            <span className="provider-browser-icon provider-browser-icon-forward" aria-hidden="true" />
          </button>
          <button
            className="provider-browser-control"
            type="button"
            aria-label="Reload"
            title={`Reload ${providerName}`}
            onClick={onReload}
            disabled={!onReload}
          >
            <span className="provider-browser-icon provider-browser-icon-reload" aria-hidden="true" />
          </button>
          <button
            className="provider-browser-control"
            type="button"
            aria-label="Provider Home"
            title={`Open ${providerName} home`}
            onClick={onGoHome}
            disabled={!onGoHome}
          >
            <span className="provider-browser-icon provider-browser-icon-home" aria-hidden="true" />
          </button>
          <button
            className="provider-browser-control provider-browser-control-import"
            type="button"
            aria-label="Import manually"
            aria-expanded={manualImportOpen}
            title="Import manually: paste or approve content yourself. Cyro cannot read provider content."
            onClick={onManualImport}
            disabled={!onManualImport}
          >
            <span className="provider-browser-icon provider-browser-icon-import" aria-hidden="true" />
          </button>
        </div>
        <div className="provider-native-canvas-label compact provider-native-canvas-lock">
          <span className="provider-native-lock-icon" aria-hidden="true" />
          <strong>Protected provider session</strong>
        </div>
        <span aria-hidden="true" />
      </div>
      {manualImportOpen ? (
        <div className="provider-manual-import-panel" role="status">
          <strong>Manual import only</strong>
          <span>Paste or approve content yourself. Cyro cannot read provider content.</span>
        </div>
      ) : null}
      <div
        className="provider-native-canvas-body provider-native-viewport-host"
        data-provider-viewport-host="true"
        ref={viewportRef}
        aria-hidden={loading ? undefined : "true"}
      >
        {loading ? (
          <div className="provider-native-loading" role="status">
            <span className="provider-loading-mark" aria-hidden="true">
              <span className="provider-loading-mark-dot" />
            </span>
            <span>Opening provider session…</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
