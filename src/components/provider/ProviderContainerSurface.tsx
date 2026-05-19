import type { Ref } from "react";
import type { ProviderContainerState, ProviderRouteId } from "../../types/provider";
import type { ProviderSurfaceStatus } from "../../services/providerShell";
import { ProviderBlockedState } from "./ProviderBlockedState";
import { ProviderNativeCanvas } from "./ProviderNativeCanvas";

type ProviderContainerSurfaceProps = {
  provider: ProviderRouteId;
  status: ProviderSurfaceStatus;
  containerState: ProviderContainerState;
  nativeContainerMessage?: string | null;
  viewportRef?: Ref<HTMLDivElement>;
  onOpenInLayoutContainer?: () => void;
  onOpenSeparateWindowFallback?: () => void;
};

export function ProviderContainerSurface({
  provider,
  status,
  containerState,
  nativeContainerMessage,
  viewportRef,
  onOpenInLayoutContainer,
  onOpenSeparateWindowFallback
}: ProviderContainerSurfaceProps) {
  if (containerState === "native_visible" || containerState === "native_opening") {
    return (
      <ProviderNativeCanvas
        provider={provider}
        containerState={containerState}
        loading={containerState === "native_opening"}
        viewportRef={viewportRef}
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
