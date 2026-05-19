import type { Ref } from "react";
import type { ProviderContainerState, ProviderRouteId } from "../../types/provider";
import { providerDisplayName } from "../../services/providerShell";

type ProviderNativeCanvasProps = {
  provider: ProviderRouteId;
  containerState: ProviderContainerState;
  loading?: boolean;
  viewportRef?: Ref<HTMLDivElement>;
};

export function ProviderNativeCanvas({
  provider,
  loading = false,
  viewportRef
}: ProviderNativeCanvasProps) {
  const providerName = providerDisplayName(provider);

  return (
    <article className="provider-native-canvas" aria-label={`${providerName} native provider canvas`}>
      <div className="provider-native-canvas-label provider-native-canvas-lock">
        <span className="provider-native-lock-icon" aria-hidden="true" />
        <strong>Protected provider session</strong>
      </div>
      <div className="provider-native-canvas-body" ref={viewportRef} aria-hidden={loading ? undefined : "true"}>
        {loading ? (
          <div className="provider-native-loading" role="status">
            <span className="provider-native-loading-pulse" aria-hidden="true" />
            <span>Opening provider session…</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
