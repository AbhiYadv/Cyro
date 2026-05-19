import type { ProviderContainerState, ProviderRouteId } from "../../types/provider";
import type { ProviderSurfaceStatus } from "../../services/providerShell";
import { ProviderBlockedState } from "./ProviderBlockedState";
import { ProviderNativeCanvas } from "./ProviderNativeCanvas";

type ProviderContainerSurfaceProps = {
  provider: ProviderRouteId;
  status: ProviderSurfaceStatus;
  containerState: ProviderContainerState;
  nativeContainerMessage?: string | null;
  onOpenInLayoutContainer?: () => void;
  onOpenSeparateWindowFallback?: () => void;
};

export function ProviderContainerSurface({
  provider,
  status,
  containerState,
  nativeContainerMessage,
  onOpenInLayoutContainer,
  onOpenSeparateWindowFallback
}: ProviderContainerSurfaceProps) {
  if (containerState === "native_visible") {
    return (
      <ProviderNativeCanvas
        provider={provider}
        containerState={containerState}
        nativeContainerMessage={nativeContainerMessage}
        onOpenSeparateWindowFallback={onOpenSeparateWindowFallback}
      />
    );
  }

  return (
    <ProviderBlockedState
      provider={provider}
      status={status}
      containerState={containerState}
      nativeContainerMessage={nativeContainerMessage}
      onOpenInLayoutContainer={onOpenInLayoutContainer}
      onOpenSeparateWindowFallback={onOpenSeparateWindowFallback}
    />
  );
}
