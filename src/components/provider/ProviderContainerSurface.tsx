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
  onGoHome?: () => void;
  onReload?: () => void;
  loadingMaskActive?: boolean;
};

export function ProviderContainerSurface({
  provider,
  status,
  containerState,
  nativeContainerMessage,
  viewportRef,
  onOpenInLayoutContainer,
  onGoHome,
  onReload,
  loadingMaskActive = false
}: ProviderContainerSurfaceProps) {
  if (loadingMaskActive || containerState === "native_visible" || containerState === "native_opening") {
    return (
      <ProviderNativeCanvas
        provider={provider}
        containerState={containerState}
        loading={loadingMaskActive || containerState === "native_opening"}
        viewportRef={viewportRef}
        onGoHome={onGoHome}
        onReload={onReload}
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
    />
  );
}
