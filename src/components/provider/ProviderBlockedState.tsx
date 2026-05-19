import type { ProviderRouteId } from "../../types/provider";
import { providerDisplayName, providerRouteStatusText } from "../../services/providerShell";
import type { ProviderSurfaceStatus } from "../../services/providerShell";
import type { ProviderNativeContainerStatus } from "../../types/provider";

type ProviderBlockedStateProps = {
  provider: ProviderRouteId;
  status: ProviderSurfaceStatus;
  nativeContainerStatus?: ProviderNativeContainerStatus;
  nativeContainerMessage?: string | null;
  onOpenNativeContainer?: () => void;
};

const fallbackOrigins: Record<Exclude<ProviderRouteId, "local">, string> = {
  chatgpt: "https://chatgpt.com",
  claude: "https://claude.ai",
  gemini: "https://gemini.google.com"
};

export function ProviderBlockedState({
  provider,
  status,
  nativeContainerStatus = "untested",
  nativeContainerMessage = null,
  onOpenNativeContainer
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

  return (
    <article className={isBlocked ? "provider-blocked-state blocked" : "provider-blocked-state"} aria-live="polite">
      <div className="provider-blocked-marker">{isBlocked ? "Blocked" : "Unvalidated"}</div>
      <div>
        <p className="eyebrow">{providerRouteStatusText(provider)}</p>
        <h2>Provider shell is not validated yet.</h2>
      </div>
      <p className="provider-blocked-cause">{isBlocked ? "Iframe display is blocked." : "Container pending."}</p>
      <p>
        {isBlocked
          ? `${providerName} returned a blank or blocked iframe in the feasibility review. Cyro will not pretend this embedded session works.`
          : `${providerName} is available as a route in the shell prototype, but manual embedded-session validation is still pending.`}
      </p>
      <p>
        Iframe embedding remains a feasibility result, not the final provider-shell solution. CYRO-PROVIDER-010 must
        validate a Tauri-native visible webview/session container with no DOM, cookie, credential, prompt, or response
        capture.
      </p>
      <p className="provider-native-boundary">No DOM, cookie, credential, prompt, or response capture.</p>
      <div className="provider-container-actions">
        {onOpenNativeContainer ? (
          <button
            className="provider-native-button"
            type="button"
            onClick={onOpenNativeContainer}
            disabled={nativeContainerStatus === "opening"}
          >
            {nativeContainerStatus === "opening" ? "Opening native container" : "Open native container"}
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
