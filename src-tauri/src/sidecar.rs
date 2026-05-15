use serde::Serialize;
use std::{
    fs,
    path::Path,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

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
    pub message: String,
    pub recoverable: bool,
    pub user_action: String,
    pub last_checked_at: Option<String>,
}

pub struct SidecarState {
    status: Mutex<SidecarBinaryStatus>,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self {
            status: Mutex::new(default_sidecar_status()),
        }
    }
}

pub fn default_sidecar_status() -> SidecarBinaryStatus {
    SidecarBinaryStatus {
        state: SidecarBinaryState::NotConfigured,
        binary_kind: None,
        path: None,
        version: None,
        message: "No llama.cpp sidecar binary is configured.".to_string(),
        recoverable: true,
        user_action: "Configure an allowlisted llama-cli path.".to_string(),
        last_checked_at: None,
    }
}

#[tauri::command]
pub fn get_sidecar_status(
    sidecar: tauri::State<'_, SidecarState>,
) -> Result<SidecarBinaryStatus, String> {
    sidecar.current_status()
}

#[tauri::command]
pub fn validate_sidecar_path(path: String) -> SidecarBinaryStatus {
    validate_sidecar_path_value(&path)
}

#[tauri::command]
pub fn set_sidecar_path(
    path: String,
    sidecar: tauri::State<'_, SidecarState>,
) -> Result<SidecarBinaryStatus, String> {
    let status = validate_sidecar_path_value(&path);
    if status.state != SidecarBinaryState::Available {
        return Err(status.message);
    }

    sidecar.set_status(status.clone())?;
    Ok(status)
}

impl SidecarState {
    pub fn current_status(&self) -> Result<SidecarBinaryStatus, String> {
        self.status
            .lock()
            .map_err(|_| "Sidecar state is unavailable.".to_string())
            .map(|status| status.clone())
    }

    pub fn set_status(&self, status: SidecarBinaryStatus) -> Result<(), String> {
        let mut current = self
            .status
            .lock()
            .map_err(|_| "Sidecar state is unavailable.".to_string())?;
        *current = status;
        Ok(())
    }
}

pub fn configured_llama_cli_path(sidecar: &SidecarState) -> Result<Option<String>, String> {
    let status = sidecar.current_status()?;
    if status.state == SidecarBinaryState::Available
        && status.binary_kind == Some(SidecarBinaryKind::LlamaCli)
    {
        return Ok(status.path);
    }

    Ok(None)
}

pub fn validate_sidecar_path_value(path: &str) -> SidecarBinaryStatus {
    let trimmed_path = path.trim();

    if trimmed_path.is_empty() {
        return sidecar_status(
            SidecarBinaryState::NotConfigured,
            None,
            None,
            None,
            "No llama.cpp sidecar binary is configured.",
            "Choose a local executable llama-cli binary.",
        );
    }

    if trimmed_path != path || contains_rejected_path_syntax(trimmed_path) {
        return sidecar_status(
            SidecarBinaryState::Error,
            None,
            Some(trimmed_path.to_string()),
            None,
            "Sidecar path must be one direct local file path, not a URL or shell command.",
            "Provide an executable llama-cli path with no command arguments.",
        );
    }

    if is_disallowed_output_path(trimmed_path) {
        return sidecar_status(
            SidecarBinaryState::UnsupportedBinary,
            None,
            Some(trimmed_path.to_string()),
            None,
            "Sidecar path points inside a generated or dependency directory.",
            "Choose a local llama.cpp build path outside node_modules, dist, .vite, or target output.",
        );
    }

    let candidate = Path::new(trimmed_path);
    let file_name = candidate.file_name().and_then(|value| value.to_str());
    let binary_kind = match file_name {
        Some("llama-cli") => Some(SidecarBinaryKind::LlamaCli),
        Some("llama-server") => Some(SidecarBinaryKind::LlamaServer),
        _ => None,
    };

    let Some(binary_kind) = binary_kind else {
        return sidecar_status(
            SidecarBinaryState::UnsupportedBinary,
            None,
            Some(trimmed_path.to_string()),
            None,
            "Only an allowlisted llama-cli binary is supported for CYRO-0007.",
            "Choose the local llama-cli binary.",
        );
    };

    if binary_kind != SidecarBinaryKind::LlamaCli {
        return sidecar_status(
            SidecarBinaryState::UnsupportedBinary,
            Some(binary_kind),
            Some(trimmed_path.to_string()),
            None,
            "llama-server is not supported in CYRO-0007.",
            "Choose llama-cli for the first non-streaming local prompt proof.",
        );
    }

    let metadata = match fs::metadata(candidate) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return sidecar_status(
                SidecarBinaryState::PathMissing,
                Some(binary_kind),
                Some(trimmed_path.to_string()),
                None,
                "Sidecar binary path does not exist.",
                "Build llama.cpp locally and choose its llama-cli binary.",
            );
        }
        Err(error) if error.kind() == std::io::ErrorKind::PermissionDenied => {
            return sidecar_status(
                SidecarBinaryState::NotExecutable,
                Some(binary_kind),
                Some(trimmed_path.to_string()),
                None,
                "Sidecar binary path is not readable.",
                "Check file permissions for the llama-cli binary.",
            );
        }
        Err(_) => {
            return sidecar_status(
                SidecarBinaryState::Error,
                Some(binary_kind),
                Some(trimmed_path.to_string()),
                None,
                "Sidecar binary path could not be inspected safely.",
                "Choose a direct local llama-cli binary path.",
            );
        }
    };

    if !metadata.is_file() {
        return sidecar_status(
            SidecarBinaryState::UnsupportedBinary,
            Some(binary_kind),
            Some(trimmed_path.to_string()),
            None,
            "Sidecar path is not a file.",
            "Choose the executable llama-cli file, not a directory.",
        );
    }

    if !is_executable(&metadata) {
        return sidecar_status(
            SidecarBinaryState::NotExecutable,
            Some(binary_kind),
            Some(trimmed_path.to_string()),
            None,
            "Sidecar binary is not executable.",
            "Make llama-cli executable and retry.",
        );
    }

    sidecar_status(
        SidecarBinaryState::Available,
        Some(binary_kind),
        Some(trimmed_path.to_string()),
        None,
        "llama-cli sidecar is available.",
        "Send a local prompt after configuring a validated GGUF model path.",
    )
}

fn sidecar_status(
    state: SidecarBinaryState,
    binary_kind: Option<SidecarBinaryKind>,
    path: Option<String>,
    version: Option<String>,
    message: &str,
    user_action: &str,
) -> SidecarBinaryStatus {
    SidecarBinaryStatus {
        state,
        binary_kind,
        path,
        version,
        message: message.to_string(),
        recoverable: true,
        user_action: user_action.to_string(),
        last_checked_at: current_timestamp_label(),
    }
}

fn contains_rejected_path_syntax(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();

    path.contains('\0')
        || path.contains('\n')
        || path.contains('\r')
        || lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("file://")
        || path.contains(';')
        || path.contains("&&")
        || path.contains("||")
        || path.contains('`')
        || path.contains("$(")
        || path.contains('>')
        || path.contains('<')
        || lower.contains("llama-cli ")
}

fn is_disallowed_output_path(path: &str) -> bool {
    path.contains("/node_modules/")
        || path.contains("/dist/")
        || path.contains("/.vite/")
        || path.contains("/target/")
}

#[cfg(unix)]
fn is_executable(metadata: &fs::Metadata) -> bool {
    use std::os::unix::fs::PermissionsExt;
    metadata.permissions().mode() & 0o111 != 0
}

#[cfg(not(unix))]
fn is_executable(_metadata: &fs::Metadata) -> bool {
    true
}

fn current_timestamp_label() -> Option<String> {
    let seconds = SystemTime::now().duration_since(UNIX_EPOCH).ok()?.as_secs();
    Some(format!("unix:{seconds}"))
}

#[cfg(test)]
mod tests {
    use super::{default_sidecar_status, validate_sidecar_path_value, SidecarBinaryState};
    use std::{
        fs,
        path::{Path, PathBuf},
        time::{SystemTime, UNIX_EPOCH},
    };

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

    #[test]
    fn valid_llama_cli_path_returns_available() {
        let sandbox = TestSandbox::new("valid");
        let binary = sandbox.write_executable("llama-cli", "#!/bin/sh\nexit 0\n");

        let status = validate_sidecar_path_value(path_str(&binary));

        assert_eq!(status.state, SidecarBinaryState::Available);
        assert!(status.path.is_some());
    }

    #[test]
    fn command_like_sidecar_path_is_rejected() {
        let status = validate_sidecar_path_value("/tmp/llama-cli --bad");

        assert_eq!(status.state, SidecarBinaryState::Error);
        assert!(status.message.contains("not a URL or shell command"));
    }

    #[test]
    fn unsupported_binary_name_is_rejected() {
        let sandbox = TestSandbox::new("unsupported");
        let binary = sandbox.write_executable("not-llama", "#!/bin/sh\nexit 0\n");

        let status = validate_sidecar_path_value(path_str(&binary));

        assert_eq!(status.state, SidecarBinaryState::UnsupportedBinary);
    }

    struct TestSandbox {
        root: PathBuf,
    }

    impl TestSandbox {
        fn new(label: &str) -> Self {
            let nanos = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system time should be valid")
                .as_nanos();
            let root = std::env::temp_dir().join(format!(
                "cyro-sidecar-{label}-{}-{nanos}",
                std::process::id()
            ));
            fs::create_dir_all(&root).expect("test sandbox should be created");

            Self { root }
        }

        fn write_executable(&self, name: &str, content: &str) -> PathBuf {
            let path = self.root.join(name);
            fs::write(&path, content).expect("test executable should be written");
            make_executable(&path);
            path
        }
    }

    impl Drop for TestSandbox {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.root);
        }
    }

    #[cfg(unix)]
    fn make_executable(path: &Path) {
        use std::os::unix::fs::PermissionsExt;
        let mut permissions = fs::metadata(path)
            .expect("test executable metadata should exist")
            .permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(path, permissions).expect("test executable should be executable");
    }

    #[cfg(not(unix))]
    fn make_executable(_path: &Path) {}

    fn path_str(path: &Path) -> &str {
        path.to_str().expect("test path should be utf8")
    }
}
