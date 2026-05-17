use std::{
    io::Read,
    process::{Child, Command, ExitStatus, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc, Mutex,
    },
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use serde::Serialize;

use crate::{
    llama_cli::{
        build_llama_cli_args_for_request, cleanup_stdout, empty_stdout_debug,
        llama_cli_working_dir, sanitize_debug_output, LlamaCliRequest, MAX_DEBUG_CHARS,
    },
    runtime_types::{FinishReason, GenerationState, RuntimeError, RuntimeMode, RuntimeRoute},
};

pub const LOCAL_PROMPT_STREAM_EVENT: &str = "cyro://local-prompt-stream";
const READ_BUFFER_BYTES: usize = 256;
const STDOUT_DRAIN_IDLE_ROUNDS: usize = 20;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum StreamEventType {
    Started,
    Delta,
    Completed,
    Cancelled,
    Timeout,
    Error,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamEvent {
    pub generation_id: String,
    pub event_type: StreamEventType,
    pub delta: Option<String>,
    pub elapsed_ms: u64,
    pub model_id: Option<String>,
    pub route: RuntimeRoute,
    pub sequence: u64,
    pub finish_reason: Option<FinishReason>,
    pub error: Option<RuntimeError>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamingPromptResult {
    pub generation_id: String,
    pub final_text: String,
    pub finish_reason: FinishReason,
    pub elapsed_ms: u64,
    pub route: RuntimeRoute,
    pub model_id: Option<String>,
    pub cancelled: bool,
    pub timed_out: bool,
    pub error: Option<RuntimeError>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelGenerationResponse {
    pub generation_id: Option<String>,
    pub state: GenerationState,
    pub cancelled: bool,
    pub message: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationSnapshot {
    pub state: GenerationState,
    pub active_generation_id: Option<String>,
    pub last_finish_reason: Option<FinishReason>,
    pub elapsed_ms: Option<u64>,
}

pub struct GenerationManager {
    active: Mutex<Option<ActiveGeneration>>,
    last_finish_reason: Mutex<Option<FinishReason>>,
}

struct ActiveGeneration {
    generation_id: String,
    child: Arc<Mutex<Child>>,
    cancel_requested: Arc<AtomicBool>,
    state: GenerationState,
    started_at: Instant,
}

impl Default for GenerationManager {
    fn default() -> Self {
        Self {
            active: Mutex::new(None),
            last_finish_reason: Mutex::new(None),
        }
    }
}

#[cfg(test)]
pub fn default_generation_snapshot() -> GenerationSnapshot {
    GenerationSnapshot {
        state: GenerationState::Idle,
        active_generation_id: None,
        last_finish_reason: None,
        elapsed_ms: None,
    }
}

impl GenerationManager {
    pub fn snapshot(&self) -> Result<GenerationSnapshot, RuntimeError> {
        let active = self.active.lock().map_err(|_| generation_state_error())?;
        let last_finish_reason = *self
            .last_finish_reason
            .lock()
            .map_err(|_| generation_state_error())?;

        if let Some(active) = active.as_ref() {
            return Ok(GenerationSnapshot {
                state: active.state,
                active_generation_id: Some(active.generation_id.clone()),
                last_finish_reason,
                elapsed_ms: Some(elapsed_ms(active.started_at)),
            });
        }

        Ok(GenerationSnapshot {
            state: last_finish_reason
                .map(generation_state_for_finish_reason)
                .unwrap_or(GenerationState::Idle),
            active_generation_id: None,
            last_finish_reason,
            elapsed_ms: None,
        })
    }

    fn begin(
        &self,
        generation_id: String,
        child: Arc<Mutex<Child>>,
        cancel_requested: Arc<AtomicBool>,
        started_at: Instant,
    ) -> Result<(), RuntimeError> {
        let mut active = self.active.lock().map_err(|_| generation_state_error())?;
        if active.is_some() {
            return Err(RuntimeError::recoverable(
                "generation_busy",
                "A local generation is already running.",
                "Cancel or wait for the active local generation before sending another prompt.",
                None,
            ));
        }

        *active = Some(ActiveGeneration {
            generation_id,
            child,
            cancel_requested,
            state: GenerationState::Starting,
            started_at,
        });
        Ok(())
    }

    fn set_state(&self, generation_id: &str, state: GenerationState) -> Result<(), RuntimeError> {
        let mut active = self.active.lock().map_err(|_| generation_state_error())?;
        if let Some(active) = active.as_mut() {
            if active.generation_id == generation_id {
                active.state = state;
            }
        }
        Ok(())
    }

    fn clear(&self, generation_id: &str, finish_reason: FinishReason) -> Result<(), RuntimeError> {
        let mut active = self.active.lock().map_err(|_| generation_state_error())?;
        if active
            .as_ref()
            .map(|active| active.generation_id == generation_id)
            .unwrap_or(false)
        {
            *active = None;
        }
        drop(active);

        let mut last_finish_reason = self
            .last_finish_reason
            .lock()
            .map_err(|_| generation_state_error())?;
        *last_finish_reason = Some(finish_reason);
        Ok(())
    }

    pub fn cancel_generation(
        &self,
        generation_id: Option<&str>,
    ) -> Result<CancelGenerationResponse, RuntimeError> {
        let mut active = self.active.lock().map_err(|_| generation_state_error())?;
        let Some(active) = active.as_mut() else {
            return Err(RuntimeError::recoverable(
                "no_active_generation",
                "There is no active local generation to cancel.",
                "Send a local prompt before using cancel.",
                None,
            ));
        };

        if let Some(generation_id) = generation_id {
            if generation_id != active.generation_id {
                return Err(RuntimeError::recoverable(
                    "generation_id_mismatch",
                    "The requested generation is no longer active.",
                    "Refresh runtime status and retry if a generation is still running.",
                    None,
                ));
            }
        }

        active.state = GenerationState::Cancelling;
        active.cancel_requested.store(true, Ordering::SeqCst);
        let generation_id = active.generation_id.clone();
        let kill_result = active
            .child
            .lock()
            .map_err(|_| generation_state_error())?
            .kill();

        if let Err(error) = kill_result {
            return Err(RuntimeError::recoverable(
                "generation_cancel_failed",
                "Cyro could not cancel the local generation.",
                "Wait for the sidecar process to finish or restart Cyro if it remains stuck.",
                Some(error.to_string()),
            ));
        }

        Ok(CancelGenerationResponse {
            generation_id: Some(generation_id),
            state: GenerationState::Cancelling,
            cancelled: true,
            message: "Cancellation requested for the active local generation.".to_string(),
        })
    }
}

#[tauri::command]
pub fn cancel_generation(
    generation_id: Option<String>,
    generation_manager: tauri::State<'_, GenerationManager>,
) -> Result<CancelGenerationResponse, RuntimeError> {
    generation_manager.cancel_generation(generation_id.as_deref())
}

pub fn run_streaming_llama_cli_prompt<F>(
    request: &LlamaCliRequest,
    mode: RuntimeMode,
    model_id: Option<String>,
    generation_manager: &GenerationManager,
    mut emit: F,
) -> Result<StreamingPromptResult, RuntimeError>
where
    F: FnMut(StreamEvent) + Send,
{
    let generation_id = new_generation_id();
    let started_at = Instant::now();
    let args = build_llama_cli_args_for_request(request);
    let working_dir = llama_cli_working_dir(&request.binary_path);

    let mut command = Command::new(&request.binary_path);
    if let Some(working_dir) = working_dir {
        command.current_dir(working_dir);
    }

    let mut child = command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| {
            RuntimeError::recoverable(
                "sidecar_spawn_failed",
                "Cyro could not start the local llama.cpp sidecar.",
                "Check that the configured llama-cli path still exists and is executable.",
                Some(error.to_string()),
            )
        })?;

    let stdout = match child.stdout.take() {
        Some(stdout) => stdout,
        None => {
            let _ = child.kill();
            let _ = child.wait();
            return Err(RuntimeError::recoverable(
                "sidecar_stdout_unavailable",
                "Cyro could not open the sidecar stdout stream.",
                "Retry the prompt after confirming the llama-cli path is valid.",
                None,
            ));
        }
    };
    let stderr = match child.stderr.take() {
        Some(stderr) => stderr,
        None => {
            let _ = child.kill();
            let _ = child.wait();
            return Err(RuntimeError::recoverable(
                "sidecar_stderr_unavailable",
                "Cyro could not open the sidecar stderr stream.",
                "Retry the prompt after confirming the llama-cli path is valid.",
                None,
            ));
        }
    };

    let child = Arc::new(Mutex::new(child));
    let cancel_requested = Arc::new(AtomicBool::new(false));
    if let Err(error) = generation_manager.begin(
        generation_id.clone(),
        Arc::clone(&child),
        Arc::clone(&cancel_requested),
        started_at,
    ) {
        let _ = child.lock().map(|mut child| child.kill());
        return Err(error);
    }

    let (stdout_tx, stdout_rx) = mpsc::channel::<String>();
    spawn_stdout_reader(stdout, stdout_tx);

    let stderr_buffer = Arc::new(Mutex::new(String::new()));
    spawn_bounded_stderr_reader(stderr, request.prompt.clone(), Arc::clone(&stderr_buffer));

    let mut sequence = 0;
    let mut emitted_stdout = String::new();
    emit(StreamEvent {
        generation_id: generation_id.clone(),
        event_type: StreamEventType::Started,
        delta: None,
        elapsed_ms: 0,
        model_id: model_id.clone(),
        route: RuntimeRoute::LocalSidecar,
        sequence,
        finish_reason: None,
        error: None,
    });
    generation_manager.set_state(&generation_id, GenerationState::Streaming)?;

    let mut raw_stdout = String::new();

    loop {
        while let Ok(delta) = stdout_rx.try_recv() {
            if delta.is_empty() {
                continue;
            }

            raw_stdout.push_str(&delta);
            emit_clean_stdout_delta(
                &raw_stdout,
                &request.prompt,
                &mut emitted_stdout,
                &mut sequence,
                &mut emit,
                &generation_id,
                &model_id,
                started_at,
            );
        }

        if cancel_requested.load(Ordering::SeqCst) {
            if child_has_exited(&child)? {
                drain_stdout(
                    &stdout_rx,
                    &mut raw_stdout,
                    &mut emitted_stdout,
                    &request.prompt,
                    &mut sequence,
                    &mut emit,
                    &generation_id,
                    &model_id,
                    started_at,
                );
                return finish_cancelled(
                    generation_manager,
                    generation_id,
                    raw_stdout,
                    request,
                    model_id,
                    mode,
                    sequence + 1,
                    started_at,
                    emit,
                );
            }
        }

        if started_at.elapsed() >= request.timeout {
            generation_manager.set_state(&generation_id, GenerationState::TimedOut)?;
            let _ = child.lock().map(|mut child| {
                let _ = child.kill();
                let _ = child.wait();
            });
            drain_stdout(
                &stdout_rx,
                &mut raw_stdout,
                &mut emitted_stdout,
                &request.prompt,
                &mut sequence,
                &mut emit,
                &generation_id,
                &model_id,
                started_at,
            );
            return finish_timed_out(
                generation_manager,
                generation_id,
                raw_stdout,
                request,
                model_id,
                mode,
                sequence + 1,
                started_at,
                emit,
            );
        }

        if let Some(exit_status) = child_exit_status(&child)? {
            let success = exit_status.success();
            drain_stdout(
                &stdout_rx,
                &mut raw_stdout,
                &mut emitted_stdout,
                &request.prompt,
                &mut sequence,
                &mut emit,
                &generation_id,
                &model_id,
                started_at,
            );

            if cancel_requested.load(Ordering::SeqCst) {
                return finish_cancelled(
                    generation_manager,
                    generation_id,
                    raw_stdout,
                    request,
                    model_id,
                    mode,
                    sequence + 1,
                    started_at,
                    emit,
                );
            }

            if !success {
                let error = RuntimeError::recoverable(
                    "sidecar_exit_failed",
                    "The local llama.cpp sidecar exited with an error.",
                    "Check the configured model path and try a shorter local prompt.",
                    bounded_stderr_debug(&stderr_buffer, &request.prompt),
                );
                return finish_error(
                    generation_manager,
                    generation_id,
                    raw_stdout,
                    request,
                    model_id,
                    mode,
                    sequence + 1,
                    started_at,
                    error,
                    emit,
                );
            }

            let final_text = cleanup_stdout(&raw_stdout, &request.prompt);
            if final_text.is_empty() {
                let elapsed_ms = elapsed_ms(started_at);
                let error = RuntimeError::recoverable(
                    "sidecar_empty_output",
                    "The local llama.cpp sidecar returned no text.",
                    "Try a shorter prompt or a different validated GGUF model.",
                    Some(format!(
                        "exitStatus={exit_status}; elapsedMs={elapsed_ms}; {}",
                        empty_stdout_debug(
                            &raw_stdout,
                            &stderr_buffer
                                .lock()
                                .map(|value| value.clone())
                                .unwrap_or_default(),
                            &request.prompt,
                        )
                    )),
                );
                return finish_error(
                    generation_manager,
                    generation_id,
                    raw_stdout,
                    request,
                    model_id,
                    mode,
                    sequence + 1,
                    started_at,
                    error,
                    emit,
                );
            }

            let elapsed_ms = elapsed_ms(started_at);
            generation_manager.clear(&generation_id, FinishReason::Completed)?;
            emit(StreamEvent {
                generation_id: generation_id.clone(),
                event_type: StreamEventType::Completed,
                delta: None,
                elapsed_ms,
                model_id: model_id.clone(),
                route: RuntimeRoute::LocalSidecar,
                sequence: sequence + 1,
                finish_reason: Some(FinishReason::Completed),
                error: None,
            });

            return Ok(StreamingPromptResult {
                generation_id,
                final_text,
                finish_reason: FinishReason::Completed,
                elapsed_ms,
                route: RuntimeRoute::LocalSidecar,
                model_id,
                cancelled: false,
                timed_out: false,
                error: None,
            });
        }

        thread::sleep(Duration::from_millis(20));
    }
}

fn finish_cancelled<F>(
    generation_manager: &GenerationManager,
    generation_id: String,
    raw_stdout: String,
    request: &LlamaCliRequest,
    model_id: Option<String>,
    _mode: RuntimeMode,
    sequence: u64,
    started_at: Instant,
    mut emit: F,
) -> Result<StreamingPromptResult, RuntimeError>
where
    F: FnMut(StreamEvent),
{
    let final_text = cleanup_stdout(&raw_stdout, &request.prompt);
    let elapsed_ms = elapsed_ms(started_at);
    generation_manager.clear(&generation_id, FinishReason::Cancelled)?;
    emit(StreamEvent {
        generation_id: generation_id.clone(),
        event_type: StreamEventType::Cancelled,
        delta: None,
        elapsed_ms,
        model_id: model_id.clone(),
        route: RuntimeRoute::LocalSidecar,
        sequence,
        finish_reason: Some(FinishReason::Cancelled),
        error: None,
    });

    Ok(StreamingPromptResult {
        generation_id,
        final_text,
        finish_reason: FinishReason::Cancelled,
        elapsed_ms,
        route: RuntimeRoute::LocalSidecar,
        model_id,
        cancelled: true,
        timed_out: false,
        error: None,
    })
}

fn finish_timed_out<F>(
    generation_manager: &GenerationManager,
    generation_id: String,
    raw_stdout: String,
    request: &LlamaCliRequest,
    model_id: Option<String>,
    _mode: RuntimeMode,
    sequence: u64,
    started_at: Instant,
    mut emit: F,
) -> Result<StreamingPromptResult, RuntimeError>
where
    F: FnMut(StreamEvent),
{
    let final_text = cleanup_stdout(&raw_stdout, &request.prompt);
    let elapsed_ms = elapsed_ms(started_at);
    let error = RuntimeError::recoverable(
        "sidecar_timeout",
        "The local llama.cpp sidecar timed out.",
        "Try a smaller model, shorter prompt, or lower token limit.",
        Some(format!("timeoutMs={}", request.timeout.as_millis())),
    );
    generation_manager.clear(&generation_id, FinishReason::TimedOut)?;
    emit(StreamEvent {
        generation_id: generation_id.clone(),
        event_type: StreamEventType::Timeout,
        delta: None,
        elapsed_ms,
        model_id: model_id.clone(),
        route: RuntimeRoute::LocalSidecar,
        sequence,
        finish_reason: Some(FinishReason::TimedOut),
        error: Some(error.clone()),
    });

    Ok(StreamingPromptResult {
        generation_id,
        final_text,
        finish_reason: FinishReason::TimedOut,
        elapsed_ms,
        route: RuntimeRoute::LocalSidecar,
        model_id,
        cancelled: false,
        timed_out: true,
        error: Some(error),
    })
}

fn finish_error<F>(
    generation_manager: &GenerationManager,
    generation_id: String,
    raw_stdout: String,
    request: &LlamaCliRequest,
    model_id: Option<String>,
    _mode: RuntimeMode,
    sequence: u64,
    started_at: Instant,
    error: RuntimeError,
    mut emit: F,
) -> Result<StreamingPromptResult, RuntimeError>
where
    F: FnMut(StreamEvent),
{
    let final_text = cleanup_stdout(&raw_stdout, &request.prompt);
    let elapsed_ms = elapsed_ms(started_at);
    generation_manager.clear(&generation_id, FinishReason::Error)?;
    emit(StreamEvent {
        generation_id: generation_id.clone(),
        event_type: StreamEventType::Error,
        delta: None,
        elapsed_ms,
        model_id: model_id.clone(),
        route: RuntimeRoute::LocalSidecar,
        sequence,
        finish_reason: Some(FinishReason::Error),
        error: Some(error.clone()),
    });

    Ok(StreamingPromptResult {
        generation_id,
        final_text,
        finish_reason: FinishReason::Error,
        elapsed_ms,
        route: RuntimeRoute::LocalSidecar,
        model_id,
        cancelled: false,
        timed_out: false,
        error: Some(error),
    })
}

fn spawn_stdout_reader(mut stdout: impl Read + Send + 'static, sender: mpsc::Sender<String>) {
    thread::spawn(move || {
        let mut buffer = [0_u8; READ_BUFFER_BYTES];
        loop {
            match stdout.read(&mut buffer) {
                Ok(0) => break,
                Ok(bytes_read) => {
                    if sender
                        .send(String::from_utf8_lossy(&buffer[..bytes_read]).to_string())
                        .is_err()
                    {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });
}

fn spawn_bounded_stderr_reader(
    mut stderr: impl Read + Send + 'static,
    prompt: String,
    output: Arc<Mutex<String>>,
) {
    thread::spawn(move || {
        let mut buffer = [0_u8; READ_BUFFER_BYTES];
        loop {
            match stderr.read(&mut buffer) {
                Ok(0) => break,
                Ok(bytes_read) => {
                    let chunk = String::from_utf8_lossy(&buffer[..bytes_read]);
                    if let Ok(mut output) = output.lock() {
                        output.push_str(&sanitize_debug_output(&chunk, &prompt));
                        if output.len() > MAX_DEBUG_CHARS {
                            output.truncate(MAX_DEBUG_CHARS);
                        }
                    }
                }
                Err(_) => break,
            }
        }
    });
}

fn drain_stdout<F>(
    receiver: &mpsc::Receiver<String>,
    raw_stdout: &mut String,
    emitted_stdout: &mut String,
    prompt: &str,
    sequence: &mut u64,
    emit: &mut F,
    generation_id: &str,
    model_id: &Option<String>,
    started_at: Instant,
) where
    F: FnMut(StreamEvent),
{
    let mut idle_rounds = 0;
    loop {
        match receiver.recv_timeout(Duration::from_millis(10)) {
            Ok(delta) => {
                idle_rounds = 0;
                if delta.is_empty() {
                    continue;
                }

                raw_stdout.push_str(&delta);
                emit_clean_stdout_delta(
                    raw_stdout,
                    prompt,
                    emitted_stdout,
                    sequence,
                    emit,
                    generation_id,
                    model_id,
                    started_at,
                );
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                idle_rounds += 1;
                if idle_rounds >= STDOUT_DRAIN_IDLE_ROUNDS {
                    break;
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }
}

fn emit_clean_stdout_delta<F>(
    raw_stdout: &str,
    prompt: &str,
    emitted_stdout: &mut String,
    sequence: &mut u64,
    emit: &mut F,
    generation_id: &str,
    model_id: &Option<String>,
    started_at: Instant,
) where
    F: FnMut(StreamEvent),
{
    let cleaned = cleanup_stdout(raw_stdout, prompt);
    if cleaned.is_empty() || cleaned == *emitted_stdout {
        return;
    }

    let delta = if cleaned.starts_with(emitted_stdout.as_str()) {
        cleaned[emitted_stdout.len()..].to_string()
    } else {
        cleaned.clone()
    };

    if delta.is_empty() {
        return;
    }

    *emitted_stdout = cleaned;
    *sequence += 1;
    emit(StreamEvent {
        generation_id: generation_id.to_string(),
        event_type: StreamEventType::Delta,
        delta: Some(delta),
        elapsed_ms: elapsed_ms(started_at),
        model_id: model_id.clone(),
        route: RuntimeRoute::LocalSidecar,
        sequence: *sequence,
        finish_reason: None,
        error: None,
    });
}

fn child_has_exited(child: &Arc<Mutex<Child>>) -> Result<bool, RuntimeError> {
    let mut child = child.lock().map_err(|_| generation_state_error())?;
    child
        .try_wait()
        .map(|status| status.is_some())
        .map_err(|error| {
            RuntimeError::recoverable(
                "sidecar_wait_failed",
                "Cyro could not read the local sidecar process result.",
                "Retry the prompt after confirming the sidecar path is valid.",
                Some(error.to_string()),
            )
        })
}

fn child_exit_status(child: &Arc<Mutex<Child>>) -> Result<Option<ExitStatus>, RuntimeError> {
    let mut child = child.lock().map_err(|_| generation_state_error())?;
    child.try_wait().map_err(|error| {
        RuntimeError::recoverable(
            "sidecar_wait_failed",
            "Cyro could not read the local sidecar process result.",
            "Retry the prompt after confirming the sidecar path is valid.",
            Some(error.to_string()),
        )
    })
}

fn bounded_stderr_debug(stderr_buffer: &Arc<Mutex<String>>, prompt: &str) -> Option<String> {
    let stderr = stderr_buffer.lock().ok()?.trim().to_string();
    if stderr.is_empty() {
        None
    } else {
        Some(
            sanitize_debug_output(&stderr, prompt)
                .chars()
                .take(MAX_DEBUG_CHARS)
                .collect(),
        )
    }
}

fn generation_state_for_finish_reason(finish_reason: FinishReason) -> GenerationState {
    match finish_reason {
        FinishReason::Completed | FinishReason::MockFallback => GenerationState::Completed,
        FinishReason::Cancelled => GenerationState::Cancelled,
        FinishReason::TimedOut => GenerationState::TimedOut,
        FinishReason::Error => GenerationState::Failed,
    }
}

fn generation_state_error() -> RuntimeError {
    RuntimeError::recoverable(
        "generation_state_unavailable",
        "Cyro could not read local generation state.",
        "Retry after the current local generation finishes.",
        None,
    )
}

fn new_generation_id() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    format!("generation:{}:{nanos}", std::process::id())
}

fn elapsed_ms(started_at: Instant) -> u64 {
    u64::try_from(started_at.elapsed().as_millis()).unwrap_or(u64::MAX)
}

#[cfg(test)]
mod tests {
    use super::{
        run_streaming_llama_cli_prompt, GenerationManager, GenerationState, StreamEventType,
    };
    use crate::{
        llama_cli::LlamaCliRequest,
        runtime_types::{FinishReason, RuntimeMode},
    };
    use std::{
        fs,
        path::{Path, PathBuf},
        sync::{Arc, Mutex},
        thread,
        time::{Duration, SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn generation_streams_started_delta_completed_and_clears_state() {
        let sandbox = TestSandbox::new("completed");
        let binary =
            sandbox.write_executable("llama-cli", "#!/bin/sh\nprintf 'one '\nprintf 'two'\n");
        let manager = GenerationManager::default();
        let events = Arc::new(Mutex::new(Vec::new()));
        let request = request_for(&binary, "private prompt", Duration::from_secs(5));
        let events_for_run = Arc::clone(&events);

        let result = run_streaming_llama_cli_prompt(
            &request,
            RuntimeMode::Fast,
            Some("qwen-0_8b-local".to_string()),
            &manager,
            |event| events_for_run.lock().unwrap().push(event),
        )
        .expect("streaming prompt should complete");

        assert_eq!(result.finish_reason, FinishReason::Completed);
        assert_eq!(result.final_text, "one two");
        assert_eq!(
            manager.snapshot().unwrap().state,
            GenerationState::Completed
        );

        let events = events.lock().unwrap();
        assert_eq!(events.first().unwrap().event_type, StreamEventType::Started);
        assert!(events
            .iter()
            .any(|event| event.event_type == StreamEventType::Delta));
        assert_eq!(
            events.last().unwrap().event_type,
            StreamEventType::Completed
        );
    }

    #[test]
    fn streaming_deltas_filter_llama_cli_decorations() {
        let prompt = "Say hello in one sentence.";
        let sandbox = TestSandbox::new("decorated");
        let script = format!(
            "#!/bin/sh\nprintf '%s\\n' 'Loading model...' '' 'build      : b9162-d52844458' 'model      : qwen2.5-0.5b-instruct-q4_k_m.gguf' 'modalities : text' '' 'available commands:' '  /exit or Ctrl+C     stop or exit' '  /regen              regenerate the last response' '  /clear              clear the chat history' '' '> {prompt}' '' '> Hello from local sidecar.' '' '[ Prompt: 1.0 t/s | Generation: 2.0 t/s ]' '>' 'Exiting...'\n"
        );
        let binary = sandbox.write_executable("llama-cli", &script);
        let manager = GenerationManager::default();
        let events = Arc::new(Mutex::new(Vec::new()));
        let events_for_run = Arc::clone(&events);
        let request = request_for(&binary, prompt, Duration::from_secs(5));

        let result = run_streaming_llama_cli_prompt(
            &request,
            RuntimeMode::Fast,
            Some("qwen-0_8b-local".to_string()),
            &manager,
            |event| events_for_run.lock().unwrap().push(event),
        )
        .expect("decorated streaming prompt should complete");

        let delta_text = events
            .lock()
            .unwrap()
            .iter()
            .filter_map(|event| event.delta.as_deref())
            .collect::<String>();

        assert_eq!(result.final_text, "Hello from local sidecar.");
        assert_eq!(delta_text, "Hello from local sidecar.");
        assert!(!delta_text.contains("Loading model"));
        assert!(!delta_text.contains("available commands"));
        assert!(!delta_text.contains(prompt));
        assert!(!delta_text.contains("[ Prompt:"));
        assert!(!delta_text.contains("Exiting"));
    }

    #[test]
    fn streaming_empty_success_returns_empty_output_diagnostics() {
        let prompt = "private prompt";
        let sandbox = TestSandbox::new("empty_success");
        let binary = sandbox.write_executable("llama-cli", "#!/bin/sh\nexit 0\n");
        let manager = GenerationManager::default();
        let events = Arc::new(Mutex::new(Vec::new()));
        let events_for_run = Arc::clone(&events);
        let request = request_for(&binary, prompt, Duration::from_secs(5));

        let result = run_streaming_llama_cli_prompt(
            &request,
            RuntimeMode::Fast,
            Some("qwen-0_8b-local".to_string()),
            &manager,
            |event| events_for_run.lock().unwrap().push(event),
        )
        .expect("streaming empty success should return an error result");

        let error = result.error.expect("empty output should surface an error");
        let debug = error.debug_detail_safe.as_deref().unwrap_or_default();

        assert_eq!(error.code, "sidecar_empty_output");
        assert_eq!(result.finish_reason, FinishReason::Error);
        assert!(debug.contains("exitStatus="));
        assert!(debug.contains("elapsedMs="));
        assert!(debug.contains("stdoutShape=bytes:0"));
        assert!(debug.contains("stderrShape=bytes:0"));
        assert!(!debug.contains(prompt));
        assert!(events
            .lock()
            .unwrap()
            .iter()
            .any(|event| event.event_type == StreamEventType::Error));
    }

    #[test]
    fn only_one_active_generation_is_allowed() {
        let sandbox = TestSandbox::new("busy");
        let binary = sandbox.write_executable("llama-cli", "#!/bin/sh\nsleep 1\necho done\n");
        let manager = Arc::new(GenerationManager::default());
        let request = request_for(&binary, "first prompt", Duration::from_secs(3));
        let manager_for_thread = Arc::clone(&manager);
        let thread_request = request.clone();

        let handle = thread::spawn(move || {
            run_streaming_llama_cli_prompt(
                &thread_request,
                RuntimeMode::Fast,
                Some("qwen-0_8b-local".to_string()),
                &manager_for_thread,
                |_| {},
            )
        });

        wait_until_active(&manager);

        let second = run_streaming_llama_cli_prompt(
            &request_for(&binary, "second prompt", Duration::from_secs(1)),
            RuntimeMode::Fast,
            Some("qwen-0_8b-local".to_string()),
            &manager,
            |_| {},
        )
        .expect_err("second generation should be rejected");

        assert_eq!(second.code, "generation_busy");
        manager.cancel_generation(None).unwrap();
        let _ = handle.join().unwrap();
    }

    #[test]
    fn cancel_transitions_streaming_to_cancelled() {
        let sandbox = TestSandbox::new("cancel");
        let binary =
            sandbox.write_executable("llama-cli", "#!/bin/sh\necho partial\nsleep 3\necho late\n");
        let manager = Arc::new(GenerationManager::default());
        let request = request_for(&binary, "cancel prompt", Duration::from_secs(5));
        let manager_for_thread = Arc::clone(&manager);

        let handle = thread::spawn(move || {
            run_streaming_llama_cli_prompt(
                &request,
                RuntimeMode::Fast,
                Some("qwen-0_8b-local".to_string()),
                &manager_for_thread,
                |_| {},
            )
        });

        wait_until_active(&manager);
        let response = manager.cancel_generation(None).unwrap();
        assert!(response.cancelled);
        assert_eq!(response.state, GenerationState::Cancelling);

        let result = handle.join().unwrap().unwrap();
        assert_eq!(result.finish_reason, FinishReason::Cancelled);
        assert!(result.cancelled);
        assert_eq!(
            manager.snapshot().unwrap().state,
            GenerationState::Cancelled
        );
    }

    #[test]
    fn timeout_kills_child_and_returns_timed_out() {
        let sandbox = TestSandbox::new("timeout");
        let binary =
            sandbox.write_executable("llama-cli", "#!/bin/sh\necho partial\nsleep 2\necho late\n");
        let manager = GenerationManager::default();
        let request = request_for(&binary, "timeout prompt", Duration::from_millis(50));

        let result = run_streaming_llama_cli_prompt(
            &request,
            RuntimeMode::Fast,
            Some("qwen-0_8b-local".to_string()),
            &manager,
            |_| {},
        )
        .expect("timeout should be returned as a recoverable result");

        assert_eq!(result.finish_reason, FinishReason::TimedOut);
        assert!(result.timed_out);
        assert_eq!(manager.snapshot().unwrap().state, GenerationState::TimedOut);
    }

    #[test]
    fn stderr_is_bounded_and_prompt_redacted() {
        let sandbox = TestSandbox::new("stderr");
        let binary = sandbox.write_executable(
            "llama-cli",
            "#!/bin/sh\nprintf 'private prompt and lots of stderr %.0s' $(seq 1 200) >&2\nexit 9\n",
        );
        let manager = GenerationManager::default();
        let request = request_for(&binary, "private prompt", Duration::from_secs(2));

        let result = run_streaming_llama_cli_prompt(
            &request,
            RuntimeMode::Fast,
            Some("qwen-0_8b-local".to_string()),
            &manager,
            |_| {},
        )
        .expect("nonzero exit should return streaming error result");

        let debug = result
            .error
            .and_then(|error| error.debug_detail_safe)
            .unwrap_or_default();
        assert!(!debug.contains("private prompt"));
        assert!(debug.len() <= super::MAX_DEBUG_CHARS);
    }

    #[test]
    #[ignore]
    fn manual_streaming_llama_cli_prompt_from_env() {
        let binary_path = std::env::var("CYRO_TEST_LLAMA_CLI_PATH")
            .expect("CYRO_TEST_LLAMA_CLI_PATH must point to llama-cli");
        let model_path =
            std::env::var("CYRO_TEST_MODEL_PATH").expect("CYRO_TEST_MODEL_PATH must point to GGUF");
        let manager = GenerationManager::default();
        let events = Arc::new(Mutex::new(Vec::new()));
        let events_for_run = Arc::clone(&events);
        let request = LlamaCliRequest::new(
            binary_path,
            model_path,
            "Answer in 3 bullets: what is PostgreSQL PITR?".to_string(),
            64,
        );

        let result = run_streaming_llama_cli_prompt(
            &request,
            RuntimeMode::Fast,
            Some("qwen-0_8b-local".to_string()),
            &manager,
            |event| events_for_run.lock().unwrap().push(event),
        )
        .expect("manual streaming sidecar prompt should run");

        assert_eq!(result.finish_reason, FinishReason::Completed);
        assert!(!result.final_text.trim().is_empty());
        assert!(events
            .lock()
            .unwrap()
            .iter()
            .any(|event| event.event_type == StreamEventType::Delta));
    }

    fn request_for(binary: &Path, prompt: &str, timeout: Duration) -> LlamaCliRequest {
        LlamaCliRequest {
            binary_path: path_str(binary).to_string(),
            model_path: "/tmp/model.gguf".to_string(),
            prompt: prompt.to_string(),
            max_tokens: 24,
            timeout,
            cpu_fallback: false,
        }
    }

    fn wait_until_active(manager: &GenerationManager) {
        for _ in 0..100 {
            let snapshot = manager.snapshot().unwrap();
            if snapshot.active_generation_id.is_some() {
                return;
            }
            thread::sleep(Duration::from_millis(10));
        }
        panic!("generation did not become active");
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
                "cyro-streaming-{label}-{}-{nanos}",
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
