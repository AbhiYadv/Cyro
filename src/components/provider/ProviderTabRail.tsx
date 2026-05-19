import { providerDisplayName } from "../../services/providerShell";
import type { ProviderContainerState, ProviderId, ProviderRouteId } from "../../types/provider";

type TabStatusVariant = "ready" | "native_visible" | "blocked" | "pending" | "opening" | "failed";

type ProviderTabRailProps = {
  selectedProvider: ProviderRouteId;
  nativeContainerStatus: Record<ProviderId, ProviderContainerState>;
  onProviderChange: (provider: ProviderRouteId) => void;
};

const tabRoutes: ProviderRouteId[] = ["local", "chatgpt", "claude", "gemini"];

function tabStatusVariant(provider: ProviderRouteId, containerStatus: Record<ProviderId, ProviderContainerState>): TabStatusVariant {
  if (provider === "local") return "ready";
  const state = containerStatus[provider as ProviderId];
  if (state === "native_visible") return "native_visible";
  if (state === "native_opening") return "opening";
  if (state === "native_failed") return "failed";
  if (provider === "chatgpt") return "blocked";
  return "pending";
}

function tabStatusLabel(variant: TabStatusVariant): string {
  switch (variant) {
    case "ready": return "Ready";
    case "native_visible": return "Native visible";
    case "opening": return "Opening";
    case "failed": return "Failed";
    case "blocked": return "Blocked";
    case "pending": return "Pending";
  }
}

export function ProviderTabRail({ selectedProvider, nativeContainerStatus, onProviderChange }: ProviderTabRailProps) {
  return (
    <nav className="provider-tab-rail" aria-label="Provider tabs">
      {tabRoutes.map((route) => {
        const variant = tabStatusVariant(route, nativeContainerStatus);
        const label = tabStatusLabel(variant);
        const isActive = selectedProvider === route;

        return (
          <button
            key={route}
            className={isActive ? "provider-tab active" : "provider-tab"}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onProviderChange(route)}
          >
            <span className="provider-tab-name">{providerDisplayName(route)}</span>
            <span className={`provider-tab-chip ${variant}`}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
