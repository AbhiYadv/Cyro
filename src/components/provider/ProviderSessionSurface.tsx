import { useEffect, useState } from "react";
import { formatRuntimeError } from "../../services/tauriClient";
import { loadProviderSurface, providerSurfaceStatusText } from "../../services/providerSession";
import type { ProviderId, ProviderSessionDescriptor } from "../../types/provider";

type ProviderSessionSurfaceProps = {
  providerId: ProviderId;
};

export function ProviderSessionSurface({ providerId }: ProviderSessionSurfaceProps) {
  const [descriptor, setDescriptor] = useState<ProviderSessionDescriptor | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      <div className={blocked ? "provider-boundary blocked" : "provider-boundary"}>
        <strong>{blocked ? "Embedding blocked or blank" : "Provider-owned surface"}</strong>
        <span>{providerSurfaceStatusText(descriptor, blocked)}</span>
      </div>

      {loading ? <div className="provider-loading">Loading provider surface...</div> : null}
      {error ? (
        <div className="error-banner" role="alert">
          {error}
        </div>
      ) : null}

      {descriptor ? (
        <>
          <div className="provider-frame-wrap">
            <iframe
              className="provider-frame"
              title={`${descriptor.displayName} embedded provider feasibility surface`}
              src={descriptor.origin}
              sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="provider-actions">
            <button type="button" onClick={() => setBlocked(true)}>
              Mark Blocked
            </button>
            {descriptor.fallbackAllowed ? (
              <a href={descriptor.origin} target="_blank" rel="noreferrer">
                Explicit Fallback
              </a>
            ) : null}
          </div>

          <p className="provider-boundary-note">{descriptor.providerOwnedLabel}</p>
          <p className="provider-boundary-note">{descriptor.blockedMessage}</p>
        </>
      ) : null}
    </section>
  );
}
