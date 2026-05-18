import { shellTools } from "../../services/providerShell";

type ProviderToolsMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function ProviderToolsMenu({ open, onClose }: ProviderToolsMenuProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="provider-tools-sheet" role="dialog" aria-label="Provider shell tools">
      <div className="tools-sheet-handle" aria-hidden="true" />
      <div className="tools-sheet-header">
        <div>
          <p className="eyebrow">Tools</p>
          <h3>Cyro tools</h3>
        </div>
        <button type="button" className="ghost-icon-button" onClick={onClose} aria-label="Close tools menu">
          Close
        </button>
      </div>
      <div className="tools-grid">
        {shellTools.map((tool) => (
          <button className="tool-row" key={tool.id} type="button">
            <span className="tool-icon" aria-hidden="true">
              {tool.label.charAt(0)}
            </span>
            <span>
              <strong>{tool.label}</strong>
              <small>{tool.description}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
