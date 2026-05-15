use serde::{Deserialize, Serialize};

mod sidecar;

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

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
enum RuntimeMode {
    Fast,
    Thinking,
}

#[derive(Serialize)]
struct LocalPromptResponse {
    response: &'static str,
    mode: RuntimeMode,
    mocked: bool,
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
fn send_local_prompt(prompt: String, mode: RuntimeMode) -> Result<LocalPromptResponse, String> {
    if prompt.trim().is_empty() {
        return Err("Enter a prompt before sending.".to_string());
    }

    if prompt.trim() == "/fail" {
        return Err("Sprint 0 mocked command failure.".to_string());
    }

    Ok(LocalPromptResponse {
        response: "Local inference is not connected yet. This is the Sprint 0 mocked response.",
        mode,
        mocked: true,
    })
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            health_check,
            get_runtime_status,
            sidecar::get_sidecar_status,
            send_local_prompt
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Cyro Sprint 0 desktop shell");
}
