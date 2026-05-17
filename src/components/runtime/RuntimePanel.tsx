import { FormEvent, useEffect, useState } from "react";
import { setModelPath, validateModelPath } from "../../services/modelRegistry";
import {
  benchmarkStatusLabel,
  backendModeLabel,
  composeActionableMessage,
  finishReasonLabel,
  formatBenchmarkElapsed,
  formatBenchmarkTokens,
  formatModelFile,
  generationStateLabel,
  isBenchmarkRunnable,
  isLocalRuntimeReady,
  latencyClassLabel,
  routeLabel,
  runtimeStateLabel
} from "../../services/runtimeStatus";
import { setSidecarPath, validateSidecarPath } from "../../services/sidecar";
import { formatRuntimeError, runRuntimeBenchmark, setRuntimeBackendMode } from "../../services/tauriClient";
import type { ModelPathValidationResult } from "../../types/modelRegistry";
import type { RuntimeBackendMode, RuntimeStatus } from "../../types/runtime";
import type { SidecarBinaryStatus } from "../../types/sidecar";

type RuntimePanelProps = {
  status: RuntimeStatus;
  onStatusRefresh: () => Promise<RuntimeStatus>;
};

function validationLabel(state: string) {
  if (state === "valid_gguf") {
    return "Valid GGUF";
  }

  return state
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMode(mode: RuntimeStatus["mode"]) {
  return mode === "fast" ? "Fast" : "Thinking";
}

export function RuntimePanel({ status, onStatusRefresh }: RuntimePanelProps) {
  const [sidecarPath, setSidecarPathInput] = useState(status.sidecar.path ?? "");
  const [modelPath, setModelPathInput] = useState(status.localModel?.filePath ?? "");
  const [sidecarValidation, setSidecarValidation] = useState<SidecarBinaryStatus | null>(status.sidecar);
  const [modelValidation, setModelValidation] = useState<ModelPathValidationResult | null>(null);
  const [configStatus, setConfigStatus] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"sidecar" | "model" | "benchmark" | "backend" | null>(null);
  const runtimeReady = isLocalRuntimeReady(status);
  const benchmarkRunnable = isBenchmarkRunnable(status);
  const latestBenchmark = status.benchmark.latestResult;
  const rows = [
    ["Runtime", runtimeStateLabel(status.runtimeState)],
    ["Generation", generationStateLabel(status.generationState)],
    ["Active Generation", status.activeGenerationId ?? "None"],
    ["Last Finish", finishReasonLabel(status.lastFinishReason)],
    ["Route", routeLabel(status.activeRoute)],
    ["Backend", status.cpuFallbackActive ? "CPU Fallback Active" : backendModeLabel(status.backendMode)],
    ["Benchmark", benchmarkStatusLabel(status.benchmark.status)],
    ["Model", status.localModel?.validated ? status.localModel.displayName : "Not Configured"],
    ["Model File", formatModelFile(status.localModel)],
    ["Mode", formatMode(status.mode)],
    ["Context Window", "Placeholder"],
    ["Vault", "Not Indexed"],
    ["Memory", "Local Only"],
    ["Sync", "Disabled"],
    ["Privacy", "Offline"]
  ];

  useEffect(() => {
    setSidecarPathInput((current) => current || status.sidecar.path || "");
    setModelPathInput((current) => current || status.localModel?.filePath || "");
    setSidecarValidation(status.sidecar);
  }, [status.sidecar, status.localModel?.filePath]);

  async function handleSidecarValidation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedSidecarPath = sidecarPath.trim();
    if (!trimmedSidecarPath) {
      setConfigStatus(null);
      setConfigError("Enter a local llama-cli path.");
      return;
    }

    setActiveAction("sidecar");
    setConfigStatus(null);
    setConfigError(null);

    try {
      const validation = await validateSidecarPath(trimmedSidecarPath);
      setSidecarValidation(validation);

      if (validation.state !== "available") {
        setConfigError(composeActionableMessage(validation.message, validation.userAction));
        return;
      }

      await setSidecarPath(trimmedSidecarPath);
      await onStatusRefresh();
      setConfigStatus("Sidecar Ready");
    } catch (error) {
      setConfigError(formatRuntimeError(error, "Sidecar validation failed."));
    } finally {
      setActiveAction(null);
    }
  }

  async function handleModelValidation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedModelPath = modelPath.trim();
    if (!trimmedModelPath) {
      setConfigStatus(null);
      setConfigError("Enter a local GGUF model path.");
      return;
    }

    setActiveAction("model");
    setConfigStatus(null);
    setConfigError(null);

    try {
      const validation = await validateModelPath(trimmedModelPath);
      setModelValidation(validation);

      if (!validation.valid) {
        setConfigError(composeActionableMessage(validation.message, validation.userAction));
        return;
      }

      await setModelPath("qwen-0_8b-local", trimmedModelPath);
      await onStatusRefresh();
      setConfigStatus("Model Valid");
    } catch (error) {
      setConfigError(formatRuntimeError(error, "Model validation failed."));
    } finally {
      setActiveAction(null);
    }
  }

  async function handleBenchmark() {
    setActiveAction("benchmark");
    setConfigStatus(null);
    setConfigError(null);

    try {
      const result = await runRuntimeBenchmark(status.mode);
      await onStatusRefresh();
      setConfigStatus(`Benchmark ${benchmarkStatusLabel(result.status)}: ${latencyClassLabel(result.latencyClass)}`);
    } catch (error) {
      setConfigError(formatRuntimeError(error, "Runtime benchmark failed."));
    } finally {
      setActiveAction(null);
    }
  }

  async function handleBackendModeChange(nextMode: RuntimeBackendMode) {
    setActiveAction("backend");
    setConfigStatus(null);
    setConfigError(null);

    try {
      const appliedMode = await setRuntimeBackendMode(nextMode);
      await onStatusRefresh();
      setConfigStatus(`Backend Mode: ${backendModeLabel(appliedMode)}`);
    } catch (error) {
      setConfigError(formatRuntimeError(error, "Backend mode update failed."));
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <aside className="runtime-panel" aria-label="Runtime panel">
      <div className="panel-header">
        <p className="eyebrow">Runtime Status</p>
        <h2>{status.health.toUpperCase()}</h2>
      </div>

      <div className={runtimeReady ? "runtime-readiness ready" : "runtime-readiness"}>
        <strong>{runtimeStateLabel(status.runtimeState)}</strong>
        <span>{status.routeExplanation}</span>
      </div>

      <div className="runtime-list">
        {rows.map(([label, value]) => (
          <div className="runtime-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <section className="runtime-config" aria-label="Local Brain setup">
        <p className="eyebrow">Local Brain Setup</p>

        <div className="runtime-path-form">
          <label htmlFor="backend-mode">Backend mode</label>
          <select
            id="backend-mode"
            aria-label="Runtime backend mode"
            value={status.backendMode}
            onChange={(event) => handleBackendModeChange(event.target.value as RuntimeBackendMode)}
            disabled={activeAction !== null}
          >
            <option value="auto">Auto</option>
            <option value="cpu">CPU fallback</option>
          </select>
          <span className="path-state">
            {status.cpuFallbackActive ? "CPU fallback active. Rust appends --device none." : "Auto backend. No CPU fallback flag is applied."}
          </span>
        </div>

        <form className="runtime-path-form" onSubmit={handleSidecarValidation}>
          <label htmlFor="sidecar-path">Sidecar path</label>
          <div className="runtime-path-row">
            <input
              id="sidecar-path"
              aria-label="llama-cli path"
              placeholder="/path/to/llama-cli"
              value={sidecarPath}
              onChange={(event) => setSidecarPathInput(event.target.value)}
              disabled={activeAction !== null}
            />
            <button type="submit" disabled={activeAction !== null}>
              {activeAction === "sidecar" ? "Checking" : "Validate Sidecar"}
            </button>
          </div>
          <span className="path-state">{sidecarValidation ? validationLabel(sidecarValidation.state) : "Not Configured"}</span>
        </form>

        <form className="runtime-path-form" onSubmit={handleModelValidation}>
          <label htmlFor="model-path">Model path</label>
          <div className="runtime-path-row">
            <input
              id="model-path"
              aria-label="GGUF model path"
              placeholder="/path/to/model.gguf"
              value={modelPath}
              onChange={(event) => setModelPathInput(event.target.value)}
              disabled={activeAction !== null}
            />
            <button type="submit" disabled={activeAction !== null}>
              {activeAction === "model" ? "Checking" : "Validate Model"}
            </button>
          </div>
          <span className="path-state">
            {modelValidation ? validationLabel(modelValidation.state) : status.localModel?.validated ? "Valid GGUF" : "Not Configured"}
          </span>
        </form>

        {status.localModel?.validated ? <span className="config-status">{formatModelFile(status.localModel)}</span> : null}
        {configStatus ? <span className="config-status">{configStatus}</span> : null}
        {configError ? (
          <span className="config-error" role="alert">
            {configError}
          </span>
        ) : null}
      </section>

      <section className="runtime-config runtime-benchmark" aria-label="Runtime benchmark">
        <div className="runtime-section-heading">
          <p className="eyebrow">Benchmark Gate</p>
          <span>Local only. Fixed prompt. No telemetry.</span>
        </div>

        <button className="benchmark-button" type="button" onClick={handleBenchmark} disabled={!benchmarkRunnable || activeAction !== null}>
          {activeAction === "benchmark" || status.benchmark.status === "running" ? "Running Benchmark" : "Run Benchmark"}
        </button>

        <div className="benchmark-result">
          <div className="runtime-row">
            <span>Status</span>
            <strong>{benchmarkStatusLabel(status.benchmark.status)}</strong>
          </div>
          <div className="runtime-row">
            <span>Elapsed</span>
            <strong>{formatBenchmarkElapsed(latestBenchmark)}</strong>
          </div>
          <div className="runtime-row">
            <span>Latency</span>
            <strong>{latestBenchmark ? latencyClassLabel(latestBenchmark.latencyClass) : "Not Run"}</strong>
          </div>
          <div className="runtime-row">
            <span>Token Estimate</span>
            <strong>{formatBenchmarkTokens(latestBenchmark)}</strong>
          </div>
          <div className="runtime-row">
            <span>Model</span>
            <strong>{latestBenchmark?.modelFileName ?? "No GGUF benchmarked"}</strong>
          </div>
          <span className={latestBenchmark?.passed ? "config-status" : "path-state"}>{latestBenchmark?.reason ?? status.benchmark.message}</span>
        </div>
      </section>

      <div className="privacy-callout">
        <strong>Local authority boundary</strong>
        <span>Sidecar execution and filesystem validation are owned by Rust/Tauri. Mock fallback remains when no local runtime is configured.</span>
      </div>
    </aside>
  );
}
