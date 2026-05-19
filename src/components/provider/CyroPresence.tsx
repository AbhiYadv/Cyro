import type {
  ProviderShellGenerationState,
  ProviderSurfaceStatus
} from "../../services/providerShell";
import type { ProviderRouteId } from "../../types/provider";

type CyroPresenceProps = {
  provider: ProviderRouteId;
  status: ProviderSurfaceStatus;
  generationState: ProviderShellGenerationState;
};

function isActiveGeneration(generationState: ProviderShellGenerationState) {
  return generationState === "starting" || generationState === "streaming" || generationState === "cancelling";
}

export function CyroPresence({ provider, status, generationState }: CyroPresenceProps) {
  const stateClass = isActiveGeneration(generationState) ? "active" : status;

  return (
    <div className={`cyro-star-presence ${provider} ${stateClass}`} aria-label="Cyro star presence" role="img">
      <div className="cyro-star-glow" aria-hidden="true" />
      <span className="cyro-star-wave" aria-hidden="true" />
      <div className="cyro-star-body" aria-hidden="true">
        <span className="cyro-star-eye left" />
        <span className="cyro-star-eye right" />
        <span className="cyro-star-smile" />
      </div>
    </div>
  );
}
