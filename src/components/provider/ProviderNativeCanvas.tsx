import type { ProviderContainerState, ProviderRouteId } from "../../types/provider";
import { providerDisplayName } from "../../services/providerShell";

type ProviderNativeCanvasProps = {
  provider: ProviderRouteId;
  containerState: ProviderContainerState;
  nativeContainerMessage?: string | null;
  onOpenSeparateWindowFallback?: () => void;
};

export function ProviderNativeCanvas({
  provider,
  containerState,
  nativeContainerMessage,
  onOpenSeparateWindowFallback
}: ProviderNativeCanvasProps) {
  const providerName = providerDisplayName(provider);

  return (
    <article className="provider-native-canvas" aria-label={`${providerName} native provider canvas`}>
      <div className="provider-native-canvas-label">
        <span>{providerName}</span>
        <strong>Provider-owned session — Cyro cannot read this content.</strong>
        <small>{nativeCanvasStatusText(containerState)}</small>
        {onOpenSeparateWindowFallback ? (
          <button
            className="provider-canvas-external-action"
            type="button"
            onClick={onOpenSeparateWindowFallback}
            aria-label="Open in separate window"
          >
            Open in separate window
          </button>
        ) : null}
      </div>
      <div className="provider-native-canvas-body" aria-hidden="true">
        <div className="provider-native-canvas-reservation">
          Native provider webview reserved region
        </div>
      </div>
      {nativeContainerMessage ? (
        <p className="provider-native-status" role="status">
          {nativeContainerMessage}
        </p>
      ) : null}
    </article>
  );
}

function nativeCanvasStatusText(containerState: ProviderContainerState) {
  if (containerState === "native_visible") {
    return "Native webview visible in this region. Login and session persistence are not validated.";
  }

  if (containerState === "native_opening") {
    return "Opening native webview.";
  }

  return "Native provider container state is visible to the user.";
}
