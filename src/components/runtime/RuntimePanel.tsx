import { FormEvent, useState } from "react";
import { setModelPath } from "../../services/modelRegistry";
import { setSidecarPath } from "../../services/sidecar";
import { formatRuntimeError } from "../../services/tauriClient";
import type { RuntimeStatus } from "../../types/runtime";

type RuntimePanelProps = {
  status: RuntimeStatus;
};

export function RuntimePanel({ status }: RuntimePanelProps) {
  const [sidecarPath, setSidecarPathInput] = useState("");
  const [modelPath, setModelPathInput] = useState("");
  const [configStatus, setConfigStatus] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const rows = [
    ["Model", status.modelLoaded ? status.modelName ?? "Loaded" : "Not Loaded"],
    ["Mode", status.mode === "fast" ? "Fast" : "Thinking"],
    ["Context Window", "Placeholder"],
    ["Vault", "Not Indexed"],
    ["Memory", "Local Only"],
    ["Sync", "Disabled"],
    ["Privacy", "Offline"]
  ];

  async function handleRuntimeConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedSidecarPath = sidecarPath.trim();
    const trimmedModelPath = modelPath.trim();
    if (!trimmedSidecarPath || !trimmedModelPath) {
      setConfigStatus(null);
      setConfigError("Enter both local runtime paths.");
      return;
    }

    setIsConfiguring(true);
    setConfigStatus(null);
    setConfigError(null);

    try {
      await setSidecarPath(trimmedSidecarPath);
      await setModelPath("qwen-0_8b-local", trimmedModelPath);
      setConfigStatus("Local sidecar ready");
    } catch (error) {
      setConfigError(formatRuntimeError(error, "Local runtime configuration failed."));
    } finally {
      setIsConfiguring(false);
    }
  }

  return (
    <aside className="runtime-panel" aria-label="Runtime panel">
      <div className="panel-header">
        <p className="eyebrow">Runtime Status</p>
        <h2>{status.health.toUpperCase()}</h2>
      </div>

      <div className="runtime-list">
        {rows.map(([label, value]) => (
          <div className="runtime-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <form className="runtime-config" onSubmit={handleRuntimeConfig}>
        <p className="eyebrow">Local Runtime</p>
        <input
          aria-label="llama-cli path"
          placeholder="/path/to/llama-cli"
          value={sidecarPath}
          onChange={(event) => setSidecarPathInput(event.target.value)}
          disabled={isConfiguring}
        />
        <input
          aria-label="GGUF model path"
          placeholder="/path/to/model.gguf"
          value={modelPath}
          onChange={(event) => setModelPathInput(event.target.value)}
          disabled={isConfiguring}
        />
        <button type="submit" disabled={isConfiguring}>
          {isConfiguring ? "Validating" : "Configure"}
        </button>
        {configStatus ? <span className="config-status">{configStatus}</span> : null}
        {configError ? (
          <span className="config-error" role="alert">
            {configError}
          </span>
        ) : null}
      </form>

      <div className="privacy-callout">
        <strong>Local authority boundary</strong>
        <span>Sidecar execution and filesystem validation are owned by Rust/Tauri. Mock fallback remains when no local runtime is configured.</span>
      </div>
    </aside>
  );
}
