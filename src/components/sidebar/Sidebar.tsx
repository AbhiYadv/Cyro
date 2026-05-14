const navItems = ["Cyro", "Local Brain", "Vault", "Skills", "Memory", "Settings"];

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          C
        </div>
        <div>
          <p className="eyebrow">Sovereign GPT</p>
          <strong>Cyro</strong>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button className={item === "Local Brain" ? "nav-item active" : "nav-item"} type="button" key={item}>
            <span className="nav-dot" aria-hidden="true" />
            {item}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="footer-label">Sprint 0</span>
        <span className="footer-value">Mocked runtime</span>
      </div>
    </aside>
  );
}
