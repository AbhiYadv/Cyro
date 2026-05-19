import type { ProviderContainerState, ProviderRouteId } from "../../types/provider";
import { providerDisplayName } from "../../services/providerShell";
import type { ProviderSurfaceStatus } from "../../services/providerShell";

type ProviderBlockedStateProps = {
  provider: ProviderRouteId;
  status: ProviderSurfaceStatus;
  containerState?: ProviderContainerState;
  nativeContainerMessage?: string | null;
  onOpenInLayoutContainer?: () => void;
  onOpenSeparateWindowFallback?: () => void;
};

export function ProviderBlockedState({
  provider,
  status,
  containerState = "idle",
  nativeContainerMessage = null,
  onOpenInLayoutContainer,
  onOpenSeparateWindowFallback
}: ProviderBlockedStateProps) {
  const providerName = providerDisplayName(provider);

  if (provider === "local") {
    return (
      <div className="provider-home-state">
        <p className="eyebrow">Local route</p>
        <h2>Private Cyro workspace</h2>
        <p>
          Draft locally, prepare approved context, and keep provider routes manual until the native provider shell is
          proven safe.
        </p>
      </div>
    );
  }

  const isBlocked = status === "blocked";

  if (containerState === "native_opening") {
    return (
      <article className="provider-blocked-state provider-opening-state" aria-live="polite">
        <div className="provider-opening-pulse" aria-hidden="true" />
        <h2>Opening native provider session…</h2>
        <p className="provider-native-boundary">No DOM, cookie, credential, prompt, or response capture.</p>
        {nativeContainerMessage ? (
          <p className="provider-native-status" role="status">
            {nativeContainerMessage}
          </p>
        ) : null}
      </article>
    );
  }

  return (
    <article className={isBlocked ? "provider-blocked-state blocked" : "provider-blocked-state"} aria-live="polite">
      <div>
        <p className="eyebrow">{providerName}</p>
        <h2>Open {providerName} in Cyro.</h2>
      </div>
      <p>
        Provider-owned content opens inside Cyro. Cyro cannot read DOM, cookies, credentials, prompts, or responses.
      </p>
      <p className="provider-blocked-cause">
        {isBlocked
          ? "Iframe embedding is blocked; use the visible native provider container or separate-window fallback."
          : "Native provider session validation is pending for this route."}
      </p>
      <div className="provider-container-actions">
        {onOpenInLayoutContainer ? (
          <button className="provider-native-button" type="button" onClick={onOpenInLayoutContainer}>
            {containerState === "native_failed" ? "Retry in Cyro" : "Open in Cyro"}
          </button>
        ) : null}
        {onOpenSeparateWindowFallback ? (
          <button className="provider-native-button secondary" type="button" onClick={onOpenSeparateWindowFallback}>
            Open separate window
          </button>
        ) : null}
      </div>
      {nativeContainerMessage ? (
        <p className="provider-native-status" role="status">
          {nativeContainerMessage}
        </p>
      ) : null}
    </article>
  );
}
