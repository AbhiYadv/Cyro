use serde::Serialize;

mod benchmark;
mod llama_cli;
mod model_registry;
mod runtime_types;
mod sidecar;

use llama_cli::{run_llama_cli_prompt, sanitize_max_tokens, LlamaCliRequest};
use runtime_types::{
    mocked_local_prompt_response, FinishReason, LocalPromptResponse, RuntimeError, RuntimeMode,
    RuntimeRoute, RuntimeState,
};

#[derive(Serialize)]
struct HealthCheck {
    health: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeStatus {
    health: &'static str,
    model_loaded: bool,
    model_name: Option<String>,
    mode: RuntimeMode,
    runtime_state: RuntimeState,
    active_route: RuntimeRoute,
    route_explanation: String,
    sidecar: sidecar::SidecarBinaryStatus,
    local_model: Option<model_registry::ModelRegistryEntry>,
    model_registry: Vec<model_registry::ModelRegistryEntry>,
    benchmark: benchmark::RuntimeBenchmarkStatus,
    last_error: Option<RuntimeError>,
    network: &'static str,
    vault: &'static str,
    memory: &'static str,
    sync: &'static str,
    privacy: &'static str,
}

#[tauri::command]
fn health_check() -> HealthCheck {
    HealthCheck { health: "ok" }
}

#[tauri::command]
fn get_runtime_status(
    model_registry: tauri::State<'_, model_registry::ModelRegistryState>,
    sidecar_state: tauri::State<'_, sidecar::SidecarState>,
    benchmark_state: tauri::State<'_, benchmark::BenchmarkState>,
) -> Result<RuntimeStatus, RuntimeError> {
    let sidecar = sidecar_state.current_status().map_err(|message| {
        RuntimeError::recoverable(
            "sidecar_state_unavailable",
            "Cyro could not read local sidecar status.",
            "Retry after configuring the local sidecar path.",
            Some(message),
        )
    })?;
    let registry = model_registry.entries().map_err(|message| {
        RuntimeError::recoverable(
            "model_registry_unavailable",
            "Cyro could not read local model registry status.",
            "Retry after validating the local GGUF model path.",
            Some(message),
        )
    })?;
    let benchmark = benchmark_state.current_status()?;

    Ok(build_runtime_status(sidecar, registry, benchmark))
}

fn build_runtime_status(
    sidecar: sidecar::SidecarBinaryStatus,
    model_registry: Vec<model_registry::ModelRegistryEntry>,
    benchmark: benchmark::RuntimeBenchmarkStatus,
) -> RuntimeStatus {
    let local_model = model_registry
        .iter()
        .find(|entry| entry.model_id == model_registry::PLACEHOLDER_MODEL_ID)
        .cloned();
    let sidecar_ready = sidecar.state == sidecar::SidecarBinaryState::Available
        && sidecar.binary_kind == Some(sidecar::SidecarBinaryKind::LlamaCli);
    let model_ready = local_model
        .as_ref()
        .map(|entry| entry.validated && entry.file_path.is_some())
        .unwrap_or(false);

    let (runtime_state, active_route, route_explanation) = match (sidecar_ready, model_ready) {
        (true, true) => {
            let benchmark_note = match benchmark.status {
                benchmark::BenchmarkStatus::NotRun => {
                    " Run the local benchmark before trusting larger model routing."
                }
                benchmark::BenchmarkStatus::Running => " Benchmark is currently running locally.",
                benchmark::BenchmarkStatus::Passed => {
                    " Latest benchmark passed the initial development gate."
                }
                benchmark::BenchmarkStatus::Slow => {
                    " Latest benchmark completed but was slow for normal use."
                }
                benchmark::BenchmarkStatus::Failed => {
                    " Latest benchmark failed; inspect the runtime error before normal use."
                }
                benchmark::BenchmarkStatus::Blocked => {
                    " Latest benchmark was blocked; resolve the sidecar/model setup first."
                }
            };

            (
                RuntimeState::Ready,
                RuntimeRoute::LocalSidecar,
                format!(
                    "Local GGUF sidecar route is ready. Prompts stay local and run through Rust-supervised llama-cli.{benchmark_note}"
                ),
            )
        }
        (true, false) => (
            RuntimeState::SidecarReady,
            RuntimeRoute::LocalMock,
            "llama-cli is validated. Configure a readable local GGUF model path to enable the sidecar route.".to_string(),
        ),
        (false, true) => (
            RuntimeState::ModelValid,
            RuntimeRoute::LocalMock,
            "A GGUF model path is validated. Configure an executable llama-cli sidecar path to enable the sidecar route.".to_string(),
        ),
        (false, false) => (
            RuntimeState::NotConfigured,
            RuntimeRoute::LocalMock,
            "Local Brain is not configured. Cyro will use the local mock fallback.".to_string(),
        ),
    };

    RuntimeStatus {
        health: "ok",
        model_loaded: false,
        model_name: local_model.as_ref().and_then(|entry| {
            if entry.validated {
                Some(entry.display_name.clone())
            } else {
                None
            }
        }),
        mode: RuntimeMode::Fast,
        runtime_state,
        active_route,
        route_explanation: route_explanation.to_string(),
        sidecar,
        local_model,
        model_registry,
        benchmark,
        last_error: None,
        network: "disabled",
        vault: "not_indexed",
        memory: "local_only",
        sync: "disabled",
        privacy: "offline",
    }
}

#[tauri::command]
fn send_local_prompt(
    prompt: String,
    mode: RuntimeMode,
    model_id: Option<String>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
    privacy_mode: Option<String>,
    model_registry: tauri::State<'_, model_registry::ModelRegistryState>,
    sidecar_state: tauri::State<'_, sidecar::SidecarState>,
) -> Result<LocalPromptResponse, RuntimeError> {
    let _ = temperature;
    let _ = privacy_mode;

    if prompt.trim().is_empty() {
        return Err(RuntimeError::recoverable(
            "empty_prompt",
            "Enter a prompt before sending.",
            "Type a local prompt and try again.",
            None,
        ));
    }

    if prompt.trim() == "/fail" {
        return Err(RuntimeError::recoverable(
            "mocked_command_failure",
            "Sprint 0 mocked command failure.",
            "Use any prompt other than /fail.",
            None,
        ));
    }

    let sidecar_path = sidecar::configured_llama_cli_path(&sidecar_state).map_err(|message| {
        RuntimeError::recoverable(
            "sidecar_state_unavailable",
            "Cyro could not read local sidecar state.",
            "Retry after configuring the local sidecar path.",
            Some(message),
        )
    })?;
    let model_entry = model_registry
        .get_model_entry(model_id.as_deref())
        .map_err(|message| {
            RuntimeError::recoverable(
                "model_registry_unavailable",
                "Cyro could not read local model registry state.",
                "Retry after validating the local GGUF model path.",
                Some(message),
            )
        })?;

    let Some(sidecar_path) = sidecar_path else {
        if model_entry
            .as_ref()
            .and_then(|entry| entry.file_path.as_ref())
            .is_none()
        {
            return Ok(mocked_local_prompt_response(mode));
        }

        return Err(RuntimeError::recoverable(
            "sidecar_not_configured",
            "No validated llama-cli sidecar path is configured.",
            "Configure a local llama-cli path before sending a real local GGUF prompt.",
            None,
        ));
    };

    let Some(model_entry) = model_entry else {
        return Err(RuntimeError::recoverable(
            "model_not_registered",
            "The requested local model is not registered.",
            "Use the qwen-0_8b-local placeholder model entry for this proof.",
            None,
        ));
    };

    let Some(model_path) = model_entry.file_path.as_deref() else {
        return Err(RuntimeError::recoverable(
            "model_not_configured",
            "No validated GGUF model path is configured.",
            "Configure a local .gguf model path before sending a real local prompt.",
            None,
        ));
    };

    let sidecar_status = sidecar::validate_sidecar_path_value(&sidecar_path);
    if sidecar_status.state != sidecar::SidecarBinaryState::Available {
        return Err(RuntimeError::recoverable(
            "sidecar_invalid",
            &sidecar_status.message,
            &sidecar_status.user_action,
            None,
        ));
    }

    let model_validation = model_registry::validate_model_path_value(model_path);
    if !model_validation.valid {
        return Err(RuntimeError::recoverable(
            "model_invalid",
            &model_validation.message,
            &model_validation.user_action,
            None,
        ));
    }

    let request = LlamaCliRequest::new(
        sidecar_path,
        model_path.to_string(),
        prompt.trim().to_string(),
        sanitize_max_tokens(max_tokens),
    );
    let output = run_llama_cli_prompt(&request)?;

    Ok(LocalPromptResponse {
        response: output.response,
        model_id: Some(model_entry.model_id),
        mode,
        route: RuntimeRoute::LocalSidecar,
        elapsed_ms: output.elapsed_ms,
        finish_reason: FinishReason::Completed,
        mocked: false,
    })
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            health_check,
            get_runtime_status,
            model_registry::get_model_registry,
            model_registry::set_model_path,
            model_registry::validate_model_path,
            sidecar::get_sidecar_status,
            sidecar::set_sidecar_path,
            sidecar::validate_sidecar_path,
            benchmark::run_runtime_benchmark,
            send_local_prompt
        ])
        .manage(model_registry::ModelRegistryState::default())
        .manage(sidecar::SidecarState::default())
        .manage(benchmark::BenchmarkState::default())
        .run(tauri::generate_context!())
        .expect("failed to run Cyro Sprint 0 desktop shell");
}

#[cfg(test)]
mod tests {
    use super::build_runtime_status;
    use crate::{
        model_registry::{
            apply_model_path_to_registry, initial_model_registry, validate_model_path_value,
        },
        runtime_types::{RuntimeRoute, RuntimeState},
        sidecar::validate_sidecar_path_value,
    };
    use std::{
        fs,
        path::{Path, PathBuf},
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn runtime_status_defaults_to_mock_when_paths_are_not_configured() {
        let status = build_runtime_status(
            crate::sidecar::default_sidecar_status(),
            initial_model_registry(),
            crate::benchmark::default_benchmark_status(),
        );

        assert_eq!(status.runtime_state, RuntimeState::NotConfigured);
        assert_eq!(status.active_route, RuntimeRoute::LocalMock);
        assert_eq!(status.local_model.unwrap().model_id, "qwen-0_8b-local");
    }

    #[test]
    fn runtime_status_is_ready_when_sidecar_and_model_are_validated() {
        let sandbox = TestSandbox::new("ready");
        let binary = sandbox.write_executable("llama-cli", "#!/bin/sh\nexit 0\n");
        let model_path = sandbox.write_file("qwen-test.gguf", b"gguf placeholder");
        let sidecar = validate_sidecar_path_value(path_str(&binary));
        let validation = validate_model_path_value(path_str(&model_path));
        let mut registry = initial_model_registry();
        apply_model_path_to_registry(&mut registry, "qwen-0_8b-local", validation).unwrap();

        let status = build_runtime_status(
            sidecar,
            registry,
            crate::benchmark::default_benchmark_status(),
        );

        assert_eq!(status.runtime_state, RuntimeState::Ready);
        assert_eq!(status.active_route, RuntimeRoute::LocalSidecar);
        assert_eq!(status.model_name.as_deref(), Some("Qwen 0.8B Local"));
        assert!(status.route_explanation.contains("Run the local benchmark"));
    }

    #[test]
    fn runtime_status_keeps_mock_route_until_both_paths_are_validated() {
        let sandbox = TestSandbox::new("partial");
        let binary = sandbox.write_executable("llama-cli", "#!/bin/sh\nexit 0\n");
        let sidecar = validate_sidecar_path_value(path_str(&binary));

        let status = build_runtime_status(
            sidecar,
            initial_model_registry(),
            crate::benchmark::default_benchmark_status(),
        );

        assert_eq!(status.runtime_state, RuntimeState::SidecarReady);
        assert_eq!(status.active_route, RuntimeRoute::LocalMock);
        assert!(status
            .route_explanation
            .contains("Configure a readable local GGUF"));
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
                "cyro-runtime-status-{label}-{}-{nanos}",
                std::process::id()
            ));
            fs::create_dir_all(&root).expect("test sandbox should be created");

            Self { root }
        }

        fn write_file(&self, name: &str, content: &[u8]) -> PathBuf {
            let path = self.root.join(name);
            fs::write(&path, content).expect("test file should be written");
            path
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
