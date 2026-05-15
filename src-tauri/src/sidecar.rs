use serde::Serialize;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
#[allow(dead_code)]
pub enum SidecarBinaryState {
    NotConfigured,
    PathMissing,
    NotExecutable,
    UnsupportedBinary,
    VersionUnknown,
    Available,
    Error,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[allow(dead_code)]
pub enum SidecarBinaryKind {
    #[serde(rename = "llama-cli")]
    LlamaCli,
    #[serde(rename = "llama-server")]
    LlamaServer,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarBinaryStatus {
    pub state: SidecarBinaryState,
    pub binary_kind: Option<SidecarBinaryKind>,
    pub path: Option<String>,
    pub version: Option<String>,
    pub message: &'static str,
    pub recoverable: bool,
    pub user_action: &'static str,
}

pub fn default_sidecar_status() -> SidecarBinaryStatus {
    SidecarBinaryStatus {
        state: SidecarBinaryState::NotConfigured,
        binary_kind: None,
        path: None,
        version: None,
        message: "No llama.cpp sidecar binary is configured.",
        recoverable: true,
        user_action: "Configure an allowlisted llama-cli path in a future sidecar validation task.",
    }
}

#[tauri::command]
pub fn get_sidecar_status() -> SidecarBinaryStatus {
    default_sidecar_status()
}

#[cfg(test)]
mod tests {
    use super::{default_sidecar_status, SidecarBinaryState};

    #[test]
    fn default_status_is_not_configured_and_recoverable() {
        let status = default_sidecar_status();

        assert_eq!(status.state, SidecarBinaryState::NotConfigured);
        assert_eq!(status.binary_kind, None);
        assert_eq!(status.path, None);
        assert_eq!(status.version, None);
        assert!(status.recoverable);
        assert!(status.message.contains("No llama.cpp sidecar binary"));
    }
}
