use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::llama_cli::{run_llama_cli_prompt, LlamaCliRequest};
use crate::model_registry::{
    validate_model_path_value, ModelRegistryEntry, ModelRegistryState, PLACEHOLDER_MODEL_ID,
};
use crate::runtime_types::{RuntimeError, RuntimeMode, RuntimeRoute};
use crate::sidecar::{
    validate_sidecar_path_value, SidecarBinaryKind, SidecarBinaryState, SidecarState,
};

const BENCHMARK_PROMPT: &str =
    "Answer with exactly three short bullets about what local inference means.";
const DEFAULT_BENCHMARK_MAX_TOKENS: u32 = 80;
const DEFAULT_BENCHMARK_TIMEOUT_MS: u64 = 60_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum BenchmarkStatus {
    NotRun,
    Running,
    Passed,
    Slow,
    Failed,
    Blocked,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum LatencyClass {
    Fast,
    Acceptable,
    Slow,
    Blocked,
    Unknown,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeBenchmarkRequest {
    pub model_id: Option<String>,
    pub mode: RuntimeMode,
    pub max_tokens: Option<u32>,
    pub timeout_ms: Option<u64>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeBenchmarkResult {
    pub benchmark_id: String,
    pub status: BenchmarkStatus,
    pub model_id: String,
    pub model_file_name: Option<String>,
    pub model_file_size_mb: Option<f64>,
    pub route: RuntimeRoute,
    pub mode: RuntimeMode,
    pub elapsed_ms: u64,
    pub tokens_per_second_optional: Option<f64>,
    pub latency_class: LatencyClass,
    pub passed: bool,
    pub reason: String,
    pub created_at: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeBenchmarkStatus {
    pub status: BenchmarkStatus,
    pub latest_result: Option<RuntimeBenchmarkResult>,
    pub message: String,
}

pub struct BenchmarkState {
    status: std::sync::Mutex<RuntimeBenchmarkStatus>,
}

impl Default for BenchmarkState {
    fn default() -> Self {
        Self {
            status: std::sync::Mutex::new(default_benchmark_status()),
        }
    }
}

impl BenchmarkState {
    pub fn current_status(&self) -> Result<RuntimeBenchmarkStatus, RuntimeError> {
        let status = self.status.lock().map_err(|_| {
            RuntimeError::recoverable(
                "benchmark_state_locked",
                "Benchmark state is unavailable.",
                "Restart Cyro and try again.",
                None,
            )
        })?;
        Ok(status.clone())
    }

    fn set_running(&self) -> Result<(), RuntimeError> {
        let mut status = self.status.lock().map_err(|_| {
            RuntimeError::recoverable(
                "benchmark_state_locked",
                "Benchmark state is unavailable.",
                "Restart Cyro and try again.",
                None,
            )
        })?;
        status.status = BenchmarkStatus::Running;
        status.message =
            "Benchmark is running locally with the fixed benchmark prompt.".to_string();
        Ok(())
    }

    fn set_result(&self, result: RuntimeBenchmarkResult) -> Result<(), RuntimeError> {
        let mut status = self.status.lock().map_err(|_| {
            RuntimeError::recoverable(
                "benchmark_state_locked",
                "Benchmark state is unavailable.",
                "Restart Cyro and try again.",
                None,
            )
        })?;
        status.status = result.status;
        status.message = result.reason.clone();
        status.latest_result = Some(result);
        Ok(())
    }
}

pub fn default_benchmark_status() -> RuntimeBenchmarkStatus {
    RuntimeBenchmarkStatus {
        status: BenchmarkStatus::NotRun,
        latest_result: None,
        message:
            "Benchmark has not run. Run a local benchmark before trusting larger model routing."
                .to_string(),
    }
}

#[tauri::command]
pub fn run_runtime_benchmark(
    model_id: Option<String>,
    mode: RuntimeMode,
    max_tokens: Option<u32>,
    timeout_ms: Option<u64>,
    model_registry: tauri::State<'_, ModelRegistryState>,
    sidecar_state: tauri::State<'_, SidecarState>,
    benchmark_state: tauri::State<'_, BenchmarkState>,
) -> Result<RuntimeBenchmarkResult, RuntimeError> {
    let request = RuntimeBenchmarkRequest {
        model_id,
        mode,
        max_tokens,
        timeout_ms,
    };

    benchmark_state.set_running()?;

    let sidecar_status = sidecar_state.current_status().map_err(|message| {
        RuntimeError::recoverable(
            "sidecar_state_unavailable",
            "Cyro could not read local sidecar state.",
            "Retry after configuring the local sidecar path.",
            Some(message),
        )
    })?;
    let sidecar_path = match (
        sidecar_status.state,
        sidecar_status.binary_kind,
        sidecar_status.path.clone(),
    ) {
        (SidecarBinaryState::Available, Some(SidecarBinaryKind::LlamaCli), Some(path)) => path,
        _ => {
            let result = blocked_missing_sidecar_result(&request);
            benchmark_state.set_result(result.clone())?;
            return Ok(result);
        }
    };

    let sidecar_validation = validate_sidecar_path_value(&sidecar_path);
    if sidecar_validation.state != SidecarBinaryState::Available {
        let result = blocked_result(
            &request,
            None,
            "The configured sidecar is not available for benchmarking.",
            "Validate the llama-cli path before running the benchmark.",
        );
        benchmark_state.set_result(result.clone())?;
        return Ok(result);
    }

    let model_entry = match model_registry
        .get_model_entry(request.model_id.as_deref())
        .map_err(|message| {
            RuntimeError::recoverable(
                "model_registry_unavailable",
                "Cyro could not read local model registry state.",
                "Retry after validating the local GGUF model path.",
                Some(message),
            )
        })? {
        Some(entry) => entry,
        None => {
            let result = blocked_missing_model_result(&request, None);
            benchmark_state.set_result(result.clone())?;
            return Ok(result);
        }
    };

    let Some(model_path) = model_entry.file_path.clone() else {
        let result = blocked_missing_model_result(&request, Some(&model_entry));
        benchmark_state.set_result(result.clone())?;
        return Ok(result);
    };

    let model_validation = validate_model_path_value(&model_path);
    if !model_validation.valid {
        let result = blocked_result(
            &request,
            Some(&model_entry),
            &model_validation.message,
            &model_validation.user_action,
        );
        benchmark_state.set_result(result.clone())?;
        return Ok(result);
    }

    let llama_request = build_benchmark_llama_cli_request(&request, &sidecar_path, &model_path);
    let result = match run_llama_cli_prompt(&llama_request) {
        Ok(output) => {
            benchmark_success_result(&request, &model_entry, output.elapsed_ms, &output.response)
        }
        Err(error) => benchmark_error_result(&request, Some(&model_entry), error),
    };

    benchmark_state.set_result(result.clone())?;
    Ok(result)
}

fn build_benchmark_llama_cli_request(
    request: &RuntimeBenchmarkRequest,
    binary_path: &str,
    model_path: &str,
) -> LlamaCliRequest {
    LlamaCliRequest {
        binary_path: binary_path.to_string(),
        model_path: model_path.to_string(),
        prompt: BENCHMARK_PROMPT.to_string(),
        max_tokens: sanitize_benchmark_max_tokens(request.max_tokens),
        timeout: Duration::from_millis(sanitize_benchmark_timeout_ms(request.timeout_ms)),
    }
}

fn benchmark_success_result(
    request: &RuntimeBenchmarkRequest,
    model_entry: &ModelRegistryEntry,
    elapsed_ms: u64,
    response: &str,
) -> RuntimeBenchmarkResult {
    let latency_class = classify_latency(elapsed_ms);
    let status = status_for_latency(latency_class);
    let reason = match latency_class {
        LatencyClass::Fast => "Benchmark passed: local sidecar responded in the fast class.",
        LatencyClass::Acceptable => {
            "Benchmark passed: local sidecar responded in the acceptable class."
        }
        LatencyClass::Slow => {
            "Benchmark completed, but this model/device pair is slow for normal use."
        }
        LatencyClass::Blocked => "Benchmark exceeded the allowed local runtime window.",
        LatencyClass::Unknown => "Benchmark completed, but latency class is unknown.",
    }
    .to_string();

    build_result(
        request,
        Some(model_entry),
        RuntimeRoute::LocalSidecar,
        status,
        latency_class,
        elapsed_ms,
        estimate_tokens_per_second(response, elapsed_ms),
        status == BenchmarkStatus::Passed,
        reason,
    )
}

fn benchmark_error_result(
    request: &RuntimeBenchmarkRequest,
    model_entry: Option<&ModelRegistryEntry>,
    error: RuntimeError,
) -> RuntimeBenchmarkResult {
    let status = match error.code.as_str() {
        "sidecar_timeout" => BenchmarkStatus::Blocked,
        "sidecar_exit_failed" | "sidecar_spawn_failed" | "sidecar_empty_response" => {
            BenchmarkStatus::Failed
        }
        _ => BenchmarkStatus::Failed,
    };
    let latency_class = if status == BenchmarkStatus::Blocked {
        LatencyClass::Blocked
    } else {
        LatencyClass::Unknown
    };
    let elapsed_ms = if error.code == "sidecar_timeout" {
        sanitize_benchmark_timeout_ms(request.timeout_ms)
    } else {
        0
    };
    let reason = format!("Benchmark failed: {}", error.message);

    build_result(
        request,
        model_entry,
        RuntimeRoute::LocalSidecar,
        status,
        latency_class,
        elapsed_ms,
        None,
        false,
        reason,
    )
}

fn blocked_missing_sidecar_result(request: &RuntimeBenchmarkRequest) -> RuntimeBenchmarkResult {
    blocked_result(
        request,
        None,
        "No validated llama-cli sidecar path is configured.",
        "Configure and validate the llama-cli path before running the benchmark.",
    )
}

fn blocked_missing_model_result(
    request: &RuntimeBenchmarkRequest,
    model_entry: Option<&ModelRegistryEntry>,
) -> RuntimeBenchmarkResult {
    blocked_result(
        request,
        model_entry,
        "No validated GGUF model path is configured.",
        "Configure and validate a local .gguf model path before running the benchmark.",
    )
}

fn blocked_result(
    request: &RuntimeBenchmarkRequest,
    model_entry: Option<&ModelRegistryEntry>,
    message: &str,
    user_action: &str,
) -> RuntimeBenchmarkResult {
    build_result(
        request,
        model_entry,
        RuntimeRoute::LocalMock,
        BenchmarkStatus::Blocked,
        LatencyClass::Blocked,
        0,
        None,
        false,
        format!("{message} {user_action}"),
    )
}

fn build_result(
    request: &RuntimeBenchmarkRequest,
    model_entry: Option<&ModelRegistryEntry>,
    route: RuntimeRoute,
    status: BenchmarkStatus,
    latency_class: LatencyClass,
    elapsed_ms: u64,
    tokens_per_second_optional: Option<f64>,
    passed: bool,
    reason: String,
) -> RuntimeBenchmarkResult {
    let created_at = unix_timestamp_label();
    let model_id = model_entry
        .map(|entry| entry.model_id.clone())
        .or_else(|| request.model_id.clone())
        .unwrap_or_else(|| PLACEHOLDER_MODEL_ID.to_string());

    RuntimeBenchmarkResult {
        benchmark_id: format!("benchmark:{}:{model_id}", created_at.replace("unix:", "")),
        status,
        model_id,
        model_file_name: model_entry.and_then(|entry| entry.file_name.clone()),
        model_file_size_mb: model_entry.and_then(|entry| entry.file_size_mb),
        route,
        mode: request.mode,
        elapsed_ms,
        tokens_per_second_optional,
        latency_class,
        passed,
        reason,
        created_at,
    }
}

fn classify_latency(elapsed_ms: u64) -> LatencyClass {
    match elapsed_ms {
        0..=5_000 => LatencyClass::Fast,
        5_001..=15_000 => LatencyClass::Acceptable,
        15_001..=60_000 => LatencyClass::Slow,
        _ => LatencyClass::Blocked,
    }
}

fn status_for_latency(latency_class: LatencyClass) -> BenchmarkStatus {
    match latency_class {
        LatencyClass::Fast | LatencyClass::Acceptable => BenchmarkStatus::Passed,
        LatencyClass::Slow => BenchmarkStatus::Slow,
        LatencyClass::Blocked => BenchmarkStatus::Blocked,
        LatencyClass::Unknown => BenchmarkStatus::Failed,
    }
}

fn estimate_tokens_per_second(response: &str, elapsed_ms: u64) -> Option<f64> {
    if elapsed_ms == 0 {
        return None;
    }
    let cleaned = response.trim();
    let tokenish_count = cleaned.split_whitespace().count();
    if tokenish_count == 0 {
        return None;
    }
    let seconds = elapsed_ms as f64 / 1_000.0;
    Some(((tokenish_count as f64 / seconds) * 10.0).round() / 10.0)
}

fn sanitize_benchmark_max_tokens(max_tokens: Option<u32>) -> u32 {
    max_tokens
        .unwrap_or(DEFAULT_BENCHMARK_MAX_TOKENS)
        .clamp(1, DEFAULT_BENCHMARK_MAX_TOKENS)
}

fn sanitize_benchmark_timeout_ms(timeout_ms: Option<u64>) -> u64 {
    timeout_ms
        .unwrap_or(DEFAULT_BENCHMARK_TIMEOUT_MS)
        .clamp(1_000, DEFAULT_BENCHMARK_TIMEOUT_MS)
}

fn unix_timestamp_label() -> String {
    match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(duration) => format!("unix:{}", duration.as_secs()),
        Err(_) => "unix:0".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::llama_cli::build_llama_cli_args;
    use crate::model_registry::initial_model_registry;
    use crate::runtime_types::RuntimeError;

    fn request() -> RuntimeBenchmarkRequest {
        RuntimeBenchmarkRequest {
            model_id: Some(PLACEHOLDER_MODEL_ID.to_string()),
            mode: RuntimeMode::Fast,
            max_tokens: Some(80),
            timeout_ms: Some(60_000),
        }
    }

    #[test]
    fn classifies_initial_latency_thresholds() {
        assert_eq!(classify_latency(5_000), LatencyClass::Fast);
        assert_eq!(classify_latency(5_001), LatencyClass::Acceptable);
        assert_eq!(classify_latency(15_000), LatencyClass::Acceptable);
        assert_eq!(classify_latency(15_001), LatencyClass::Slow);
        assert_eq!(classify_latency(60_000), LatencyClass::Slow);
        assert_eq!(classify_latency(60_001), LatencyClass::Blocked);
    }

    #[test]
    fn benchmark_request_uses_fixed_prompt_and_structured_args() {
        let llama_request = build_benchmark_llama_cli_request(
            &request(),
            "/usr/local/bin/llama-cli",
            "/tmp/model.gguf",
        );
        assert_eq!(llama_request.prompt, BENCHMARK_PROMPT);
        assert_eq!(llama_request.max_tokens, 80);
        assert_eq!(llama_request.timeout, Duration::from_millis(60_000));

        let args = build_llama_cli_args(
            &llama_request.model_path,
            &llama_request.prompt,
            llama_request.max_tokens,
        );
        assert!(args.contains(&"-m".to_string()));
        assert!(args.contains(&"/tmp/model.gguf".to_string()));
        assert!(args.contains(&"-p".to_string()));
        assert!(args.contains(&BENCHMARK_PROMPT.to_string()));
        assert!(!args.join(" ").contains("sh -c"));
    }

    #[test]
    fn benchmark_blocks_when_sidecar_not_configured() {
        let result = blocked_missing_sidecar_result(&request());
        assert_eq!(result.status, BenchmarkStatus::Blocked);
        assert_eq!(result.latency_class, LatencyClass::Blocked);
        assert!(!result.passed);
        assert!(result.reason.contains("llama-cli"));
    }

    #[test]
    fn benchmark_blocks_when_model_not_valid() {
        let registry = initial_model_registry();
        let result = blocked_missing_model_result(&request(), registry.first());
        assert_eq!(result.status, BenchmarkStatus::Blocked);
        assert_eq!(result.latency_class, LatencyClass::Blocked);
        assert_eq!(result.model_id, PLACEHOLDER_MODEL_ID);
        assert!(result.reason.contains(".gguf"));
    }

    #[test]
    fn benchmark_maps_timeout_to_blocked_result() {
        let error = RuntimeError::recoverable(
            "sidecar_timeout",
            "Local inference timed out.",
            "Try a smaller model.",
            None,
        );
        let result = benchmark_error_result(&request(), None, error);
        assert_eq!(result.status, BenchmarkStatus::Blocked);
        assert_eq!(result.latency_class, LatencyClass::Blocked);
        assert_eq!(result.elapsed_ms, 60_000);
        assert!(!result.passed);
    }

    #[test]
    fn benchmark_maps_nonzero_exit_to_failed_result() {
        let error = RuntimeError::recoverable(
            "sidecar_exit_failed",
            "llama-cli exited with a nonzero status.",
            "Check the sidecar and model path.",
            Some("exit status: 1".to_string()),
        );
        let result = benchmark_error_result(&request(), None, error);
        assert_eq!(result.status, BenchmarkStatus::Failed);
        assert_eq!(result.latency_class, LatencyClass::Unknown);
        assert!(!result.passed);
    }

    #[test]
    fn success_result_includes_latency_and_local_sidecar_route() {
        let mut entry = initial_model_registry().remove(0);
        entry.file_name = Some("qwen.gguf".to_string());
        entry.file_size_mb = Some(512.0);
        let result =
            benchmark_success_result(&request(), &entry, 11_000, "- local\n- private\n- offline");
        assert_eq!(result.status, BenchmarkStatus::Passed);
        assert_eq!(result.latency_class, LatencyClass::Acceptable);
        assert_eq!(result.route, RuntimeRoute::LocalSidecar);
        assert_eq!(result.model_file_name, Some("qwen.gguf".to_string()));
        assert!(result.tokens_per_second_optional.is_some());
    }
}
