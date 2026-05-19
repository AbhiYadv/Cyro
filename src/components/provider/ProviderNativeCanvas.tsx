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
  nativeContainerMessage,
  onOpenSeparateWindowFallback
}: ProviderNativeCanvasProps) {
  const providerName = providerDisplayName(provider);

  return (
    <article className="provider-native-canvas" aria-label={`${providerName} native provider canvas`}>
      <div className="provider-native-canvas-label provider-native-canvas-lock">
        <span className="provider-native-lock-mark">Lock</span>
        <strong>Provider-owned session — Cyro cannot read this content.</strong>
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
