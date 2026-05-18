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
    <div className={`cyro-presence ${provider} ${stateClass}`} aria-label="Cyro Presence" role="img">
      <div className="cyro-presence-ring" aria-hidden="true">
        <span className="cyro-presence-node one" />
        <span className="cyro-presence-node two" />
        <span className="cyro-presence-node three" />
      </div>
      <div className="cyro-presence-core" aria-hidden="true">
        <span className="cyro-presence-glint" />
      </div>
    </div>
  );
}
