const badges = ["Offline Ready", "Model Not Loaded", "Local Only", "Network Disabled"];

export function TopStatusBar() {
  return (
    <header className="top-status-bar" aria-label="Runtime status">
      <div>
        <p className="eyebrow">Cyro Desktop</p>
        <h1>Local Brain</h1>
      </div>
      <div className="status-badges" aria-label="Safety badges">
        {badges.map((badge) => (
          <span className="status-badge" key={badge}>
            {badge}
          </span>
        ))}
      </div>
    </header>
  );
}
