type CyroLeftDrawerProps = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
};

const recentChats = [
  "Provider shell feasibility",
  "Local memory capsule draft",
  "Mobile Snapshot planning",
  "Runtime benchmark notes"
];

const providerRoutes = ["Local", "ChatGPT", "Claude", "Gemini"];

export function CyroLeftDrawer({ open, onToggle, onClose }: CyroLeftDrawerProps) {
  return (
    <>
      {open ? <button className="drawer-scrim" type="button" aria-label="Close left drawer" onClick={onClose} /> : null}
      <aside className={open ? "cyro-left-drawer open" : "cyro-left-drawer"} aria-label="Cyro navigation drawer">
        <div className="drawer-top-row">
          <div className="drawer-brand">
            <span className="drawer-brand-mark">C</span>
            <strong>Cyro</strong>
          </div>
          <button className="ghost-icon-button" type="button" onClick={onToggle} aria-label={open ? "Close navigation drawer" : "Open navigation drawer"}>
            {open ? "Close" : "Menu"}
          </button>
        </div>

        <label className="drawer-search">
          <span>Search chats</span>
          <input aria-label="Search chats" placeholder="Search chats" />
        </label>

        <button className="drawer-primary-action" type="button">
          New chat
        </button>

        <nav className="drawer-nav" aria-label="Cyro sections">
          <p className="drawer-section-title">Workspace</p>
          <button type="button">Memory</button>
          <button type="button">Vault</button>
          <button type="button">Provider sessions</button>
          <button type="button">Notebooks</button>
        </nav>

        <section className="drawer-provider-routes" aria-label="Provider route placeholders">
          <p className="drawer-section-title">Providers</p>
          {providerRoutes.map((route) => (
            <button type="button" key={route}>
              <span>{route}</span>
              <small>{route === "Local" ? "Ready" : "Shell only"}</small>
            </button>
          ))}
        </section>

        <section className="drawer-recents" aria-label="Recent chats">
          <p className="drawer-section-title">Recent chats</p>
          {recentChats.map((chat) => (
            <button type="button" key={chat}>
              {chat}
            </button>
          ))}
        </section>
      </aside>
    </>
  );
}
