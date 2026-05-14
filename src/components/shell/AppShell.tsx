import { useEffect, useState } from "react";
import { ChatWorkspace } from "../chat/ChatWorkspace";
import { RuntimePanel } from "../runtime/RuntimePanel";
import { Sidebar } from "../sidebar/Sidebar";
import { TopStatusBar } from "./TopStatusBar";
import { getRuntimeStatus } from "../../services/tauriClient";
import type { RuntimeMode, RuntimeStatus } from "../../types/runtime";

const defaultRuntimeStatus: RuntimeStatus = {
  health: "ok",
  modelLoaded: false,
  modelName: null,
  mode: "fast",
  network: "disabled",
  vault: "not_indexed",
  memory: "local_only",
  sync: "disabled",
  privacy: "offline"
};

export function AppShell() {
  const [mode, setMode] = useState<RuntimeMode>("fast");
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>(defaultRuntimeStatus);

  useEffect(() => {
    let active = true;

    getRuntimeStatus()
      .then((status) => {
        if (active) {
          setRuntimeStatus(status);
          setMode(status.mode);
        }
      })
      .catch(() => {
        if (active) {
          setRuntimeStatus(defaultRuntimeStatus);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="workspace-frame">
        <TopStatusBar />
        <ChatWorkspace mode={mode} onModeChange={setMode} />
      </main>
      <RuntimePanel status={{ ...runtimeStatus, mode }} />
    </div>
  );
}
