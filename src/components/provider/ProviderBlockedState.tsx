import type { ProviderContainerState, ProviderRouteId } from "../../types/provider";
import { providerDisplayName, providerRouteStatusText } from "../../services/providerShell";
import type { ProviderSurfaceStatus } from "../../services/providerShell";

type ProviderBlockedStateProps = {
  provider: ProviderRouteId;
  status: ProviderSurfaceStatus;
  containerState?: ProviderContainerState;
  nativeContainerMessage?: string | null;
  onOpenInLayoutContainer?: () => void;
  onOpenSeparateWindowFallback?: () => void;
};

const fallbackOrigins: Record<Exclude<ProviderRouteId, "local">, string> = {
  chatgpt: "https://chatgpt.com",
  claude: "https://claude.ai",
  gemini: "https://gemini.google.com"
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

  const nativeStatusLabel = nativeContainerStatusLabel(containerState);

  return (
    <article className={isBlocked ? "provider-blocked-state blocked" : "provider-blocked-state"} aria-live="polite">
      <div className="provider-blocked-marker">{nativeStatusLabel ?? (isBlocked ? "Blocked" : "Unvalidated")}</div>
      <div>
        <p className="eyebrow">{providerRouteStatusText(provider)}</p>
        <h2>Native provider session pending.</h2>
      </div>
      <p className="provider-blocked-cause">{isBlocked ? "Iframe embedding is blocked." : "Native session validation pending."}</p>
      <p>
        {isBlocked
          ? `${providerName} returned a blank or blocked iframe in the feasibility review. A native provider container is being validated for this route.`
          : `${providerName} is available as a route in the shell, but native provider session validation is next.`}
      </p>
      <p className="provider-native-boundary">No DOM, cookie, credential, prompt, or response capture.</p>
      <div className="provider-container-actions">
        {containerState === "native_failed" && onOpenInLayoutContainer ? (
          <button className="provider-native-button" type="button" onClick={onOpenInLayoutContainer}>
            Retry native session
          </button>
        ) : null}
        {onOpenSeparateWindowFallback ? (
          <button className="provider-native-button secondary" type="button" onClick={onOpenSeparateWindowFallback}>
            Separate window fallback
          </button>
        ) : null}
        <a className="provider-fallback-link" href={fallbackOrigins[provider]} target="_blank" rel="noreferrer">
          Explicit fallback
        </a>
      </div>
      {nativeContainerMessage ? (
        <p className="provider-native-status" role="status">
          {nativeContainerMessage}
        </p>
      ) : null}
    </article>
  );
}

function nativeContainerStatusLabel(status: ProviderContainerState) {
  switch (status) {
    case "native_visible":
      return "Native visible";
    case "separate_window_fallback":
      return "Separate window fallback";
    case "native_failed":
      return "Failed";
    case "native_opening":
      return "Opening";
    case "iframe_blocked":
      return "Blocked";
    default:
      return null;
  }
}
