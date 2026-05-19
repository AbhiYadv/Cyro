import type { ProviderContainerState, ProviderRouteId } from "../../types/provider";
import { providerDisplayName } from "../../services/providerShell";

type ProviderNativeCanvasProps = {
  provider: ProviderRouteId;
  containerState: ProviderContainerState;
};

export function ProviderNativeCanvas({
  provider
}: ProviderNativeCanvasProps) {
  const providerName = providerDisplayName(provider);

  return (
    <article className="provider-native-canvas" aria-label={`${providerName} native provider canvas`}>
      <div className="provider-native-canvas-label provider-native-canvas-lock">
        <span className="provider-native-lock-icon" aria-hidden="true" />
        <strong>Protected provider session</strong>
      </div>
      <div className="provider-native-canvas-body" aria-hidden="true" />
    </article>
  );
}
