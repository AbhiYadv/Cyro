use serde::Serialize;

mod llama_cli;
mod model_registry;
mod runtime_types;
mod sidecar;

use llama_cli::{run_llama_cli_prompt, sanitize_max_tokens, LlamaCliRequest};
use runtime_types::{
    mocked_local_prompt_response, FinishReason, LocalPromptResponse, RuntimeError, RuntimeMode,
    RuntimeRoute,
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
fn get_runtime_status() -> RuntimeStatus {
    RuntimeStatus {
        health: "ok",
        model_loaded: false,
        model_name: None,
        mode: RuntimeMode::Fast,
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
            send_local_prompt
        ])
        .manage(model_registry::ModelRegistryState::default())
        .manage(sidecar::SidecarState::default())
        .run(tauri::generate_context!())
        .expect("failed to run Cyro Sprint 0 desktop shell");
}
