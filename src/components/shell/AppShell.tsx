import { useCallback, useEffect, useState } from "react";
import { ChatWorkspace } from "../chat/ChatWorkspace";
import { RuntimePanel } from "../runtime/RuntimePanel";
import { Sidebar } from "../sidebar/Sidebar";
import { TopStatusBar } from "./TopStatusBar";
import { getRuntimeStatus } from "../../services/tauriClient";
import { placeholderModelRegistry } from "../../services/modelRegistry";
import { mockedSidecarStatus } from "../../services/sidecar";
import type { RuntimeMode, RuntimeStatus } from "../../types/runtime";

const defaultRuntimeStatus: RuntimeStatus = {
  health: "ok",
  modelLoaded: false,
  modelName: null,
  mode: "fast",
  runtimeState: "not_configured",
  activeRoute: "local_mock",
  routeExplanation: "Local Brain is not configured. Cyro will use the local mock fallback.",
  sidecar: mockedSidecarStatus,
  localModel: placeholderModelRegistry[0],
  modelRegistry: placeholderModelRegistry,
  benchmark: {
    status: "not_run",
    latestResult: null,
    message: "Benchmark has not run. Configure local runtime paths before benchmarking."
  },
  generationState: "idle",
  activeGenerationId: null,
  lastFinishReason: null,
  lastError: null,
  network: "disabled",
  vault: "not_indexed",
  memory: "local_only",
  sync: "disabled",
  privacy: "offline"
};

export function AppShell() {
  const [mode, setMode] = useState<RuntimeMode>("fast");
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>(defaultRuntimeStatus);

  const refreshRuntimeStatus = useCallback(async () => {
    const status = await getRuntimeStatus();
    setRuntimeStatus(status);
    return status;
  }, []);

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
        <ChatWorkspace mode={mode} onModeChange={setMode} onPromptComplete={refreshRuntimeStatus} />
      </main>
      <RuntimePanel status={{ ...runtimeStatus, mode }} onStatusRefresh={refreshRuntimeStatus} />
    </div>
  );
}
