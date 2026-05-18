import { useEffect, useState } from "react";
import { formatRuntimeError } from "../../services/tauriClient";
import {
  hasBlockedOrBlankProviderResult,
  loadProviderSurface,
  providerSurfaceStatusText
} from "../../services/providerSession";
import type { ProviderId, ProviderSessionDescriptor } from "../../types/provider";

type ProviderSessionSurfaceProps = {
  providerId: ProviderId;
};

export function ProviderSessionSurface({ providerId }: ProviderSessionSurfaceProps) {
  const [descriptor, setDescriptor] = useState<ProviderSessionDescriptor | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const knownBlocked = hasBlockedOrBlankProviderResult(descriptor);
  const blockedSurface = blocked || knownBlocked;

  useEffect(() => {
    let active = true;
    setDescriptor(null);
    setBlocked(false);
    setLoading(true);
    setError(null);

    loadProviderSurface(providerId)
      .then((nextDescriptor) => {
        if (active) {
          setDescriptor(nextDescriptor);
        }
      })
      .catch((caughtError) => {
        if (active) {
          setError(formatRuntimeError(caughtError, "Provider surface failed to load."));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [providerId]);

  return (
    <section className="provider-session-shell" aria-label="Embedded provider session feasibility">
      <div className="provider-session-header">
        <div>
          <p className="eyebrow">Provider Feasibility</p>
          <h2>{descriptor?.displayName ?? "Provider Session"}</h2>
        </div>
        {descriptor ? <span className="provider-origin">{descriptor.origin}</span> : null}
      </div>

      <div className={blockedSurface ? "provider-boundary blocked" : "provider-boundary"}>
        <strong>{blockedSurface ? "Iframe embedding blocked or blank" : "Iframe feasibility surface"}</strong>
        <span>{providerSurfaceStatusText(descriptor, blockedSurface)}</span>
      </div>

      {loading ? <div className="provider-loading">Loading provider surface...</div> : null}
      {error ? (
        <div className="error-banner" role="alert">
          {error}
        </div>
      ) : null}

      {descriptor ? (
        <>
          <div className={blockedSurface ? "provider-frame-wrap blocked" : "provider-frame-wrap"}>
            {blockedSurface ? (
              <div className="provider-frame-blocked" role="status">
                <strong>No usable embedded provider session is confirmed.</strong>
                <p>{descriptor.feasibilityResult}</p>
                <p>
                  Current mechanism: React iframe. Next path: Tauri-native provider shell research with
                  isolated, visible user-controlled sessions.
                </p>
              </div>
            ) : (
              <iframe
                className="provider-frame"
                title={`${descriptor.displayName} embedded provider feasibility surface`}
                src={descriptor.origin}
                sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          <div className="provider-actions">
            {!knownBlocked ? (
              <button type="button" onClick={() => setBlocked(true)}>
                Mark Blank/Blocked
              </button>
            ) : null}
            {descriptor.fallbackAllowed ? (
              <a href={descriptor.origin} target="_blank" rel="noreferrer">
                Explicit Fallback
              </a>
            ) : null}
          </div>

          <p className="provider-boundary-note">Surface mechanism: {descriptor.surfaceMechanism} feasibility only.</p>
          <p className="provider-boundary-note">{descriptor.providerOwnedLabel}</p>
          <p className="provider-boundary-note">{descriptor.blockedMessage}</p>
        </>
      ) : null}
    </section>
  );
}
