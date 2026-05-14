import type { RuntimeStatus } from "../../types/runtime";

type RuntimePanelProps = {
  status: RuntimeStatus;
};

export function RuntimePanel({ status }: RuntimePanelProps) {
  const rows = [
    ["Model", status.modelLoaded ? status.modelName ?? "Loaded" : "Not Loaded"],
    ["Mode", status.mode === "fast" ? "Fast" : "Thinking"],
    ["Context Window", "Placeholder"],
    ["Vault", "Not Indexed"],
    ["Memory", "Local Only"],
    ["Sync", "Disabled"],
    ["Privacy", "Offline"]
  ];

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

      <div className="privacy-callout">
        <strong>Local authority boundary</strong>
        <span>System commands are owned by the Rust/Tauri layer. Sprint 0 runtime state is mocked.</span>
      </div>
    </aside>
  );
}
