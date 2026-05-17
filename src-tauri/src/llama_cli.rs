use std::{
    io::Read,
    path::{Path, PathBuf},
    process::{Command, ExitStatus, Stdio},
    sync::{mpsc, Mutex},
    thread,
    time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};

use crate::runtime_types::{FinishReason, RuntimeError};

const DEFAULT_PROMPT_TIMEOUT_SECS: u64 = 60;
pub(crate) const MAX_DEBUG_CHARS: usize = 1_200;
const LLAMA_CLI_ONE_SHOT_ARGS: [&str; 1] = ["--single-turn"];

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RuntimeBackendMode {
    Auto,
    Cpu,
}

impl RuntimeBackendMode {
    pub fn cpu_fallback_applied(self) -> bool {
        self == RuntimeBackendMode::Cpu
    }

    fn as_str(self) -> &'static str {
        match self {
            RuntimeBackendMode::Auto => "auto",
            RuntimeBackendMode::Cpu => "cpu",
        }
    }

    fn default_for_process() -> Self {
        if dev_cpu_fallback_enabled() {
            RuntimeBackendMode::Cpu
        } else {
            RuntimeBackendMode::Auto
        }
    }
}

pub struct BackendModeState {
    mode: Mutex<RuntimeBackendMode>,
}

impl Default for BackendModeState {
    fn default() -> Self {
        Self {
            mode: Mutex::new(RuntimeBackendMode::default_for_process()),
        }
    }
}

impl BackendModeState {
    pub fn current_mode(&self) -> Result<RuntimeBackendMode, RuntimeError> {
        let mode = self.mode.lock().map_err(|_| {
            RuntimeError::recoverable(
                "backend_mode_state_locked",
                "Runtime backend mode is unavailable.",
                "Restart Cyro and try again.",
                None,
            )
        })?;
        Ok(*mode)
    }

    fn set_mode(&self, next_mode: RuntimeBackendMode) -> Result<RuntimeBackendMode, RuntimeError> {
        let mut mode = self.mode.lock().map_err(|_| {
            RuntimeError::recoverable(
                "backend_mode_state_locked",
                "Runtime backend mode is unavailable.",
                "Restart Cyro and try again.",
                None,
            )
        })?;
        *mode = next_mode;
        Ok(*mode)
    }
}

#[tauri::command]
pub fn set_runtime_backend_mode(
    mode: RuntimeBackendMode,
    backend_mode_state: tauri::State<'_, BackendModeState>,
) -> Result<RuntimeBackendMode, RuntimeError> {
    backend_mode_state.set_mode(mode)
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LlamaCliRequest {
    pub binary_path: String,
    pub model_path: String,
    pub prompt: String,
    pub max_tokens: u32,
    pub timeout: Duration,
    pub backend_mode: RuntimeBackendMode,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LlamaCliOutput {
    pub response: String,
    pub elapsed_ms: u64,
    pub finish_reason: FinishReason,
}

impl LlamaCliRequest {
    #[cfg(test)]
    pub fn new(binary_path: String, model_path: String, prompt: String, max_tokens: u32) -> Self {
        Self {
            binary_path,
            model_path,
            prompt,
            max_tokens,
            timeout: Duration::from_secs(DEFAULT_PROMPT_TIMEOUT_SECS),
            backend_mode: RuntimeBackendMode::default_for_process(),
        }
    }

    pub fn new_with_backend_mode(
        binary_path: String,
        model_path: String,
        prompt: String,
        max_tokens: u32,
        backend_mode: RuntimeBackendMode,
    ) -> Self {
        Self {
            binary_path,
            model_path,
            prompt,
            max_tokens,
            timeout: Duration::from_secs(DEFAULT_PROMPT_TIMEOUT_SECS),
            backend_mode,
        }
    }

    fn launch_fingerprint(&self, working_dir: Option<&Path>) -> String {
        format!(
            "backendMode={}; cpuFallbackApplied={}; workingDir={}; argFingerprint=modelPathConfigured:true,promptRedacted:true,maxTokens:{},singleTurn:true,deviceNone:{}",
            self.backend_mode.as_str(),
            self.backend_mode.cpu_fallback_applied(),
            working_dir
                .map(|path| path.display().to_string())
                .unwrap_or_else(|| "[not set]".to_string()),
            self.max_tokens,
            self.backend_mode.cpu_fallback_applied()
        )
    }
}

pub fn sanitize_max_tokens(max_tokens: Option<u32>) -> u32 {
    max_tokens.unwrap_or(120).clamp(1, 256)
}

pub fn build_llama_cli_args(model_path: &str, prompt: &str, max_tokens: u32) -> Vec<String> {
    let mut args = vec![
        "-m".to_string(),
        model_path.to_string(),
        "-p".to_string(),
        prompt.to_string(),
        "-n".to_string(),
        max_tokens.to_string(),
    ];

    args.extend(LLAMA_CLI_ONE_SHOT_ARGS.iter().map(|arg| arg.to_string()));
    args
}

pub fn build_llama_cli_args_for_request(request: &LlamaCliRequest) -> Vec<String> {
    let mut args = build_llama_cli_args(&request.model_path, &request.prompt, request.max_tokens);
    if request.backend_mode.cpu_fallback_applied() {
        args.extend(["--device".to_string(), "none".to_string()]);
    }
    args
}

pub(crate) fn llama_cli_working_dir(binary_path: &str) -> Option<PathBuf> {
    Path::new(binary_path).parent().map(Path::to_path_buf)
}

pub fn run_llama_cli_prompt(request: &LlamaCliRequest) -> Result<LlamaCliOutput, RuntimeError> {
    let started_at = Instant::now();
    let working_dir = llama_cli_working_dir(&request.binary_path);
    let output = capture_llama_cli_output(request, working_dir.as_deref(), started_at)?;
    let elapsed_ms = elapsed_ms(started_at);

    if !output.status.success() {
        return Err(RuntimeError::recoverable(
            "sidecar_exit_failed",
            "The local llama.cpp sidecar exited with an error.",
            "Check the configured model path and try a shorter local prompt.",
            Some(format!(
                "exitStatus={}; elapsedMs={elapsed_ms}; {}; {}",
                output.status,
                request.launch_fingerprint(working_dir.as_deref()),
                empty_stdout_debug(&output.stdout, &output.stderr, &request.prompt)
            )),
        ));
    }

    let response = cleanup_stdout(&output.stdout, &request.prompt);
    if response.is_empty() {
        return Err(RuntimeError::recoverable(
            "sidecar_empty_output",
            "The local llama.cpp sidecar returned no text.",
            "Try a shorter prompt or a different validated GGUF model.",
            Some(format!(
                "exitStatus={}; elapsedMs={elapsed_ms}; {}; {}",
                output.status,
                request.launch_fingerprint(working_dir.as_deref()),
                empty_stdout_debug(&output.stdout, &output.stderr, &request.prompt)
            )),
        ));
    }

    Ok(LlamaCliOutput {
        response,
        elapsed_ms,
        finish_reason: FinishReason::Completed,
    })
}

struct CapturedLlamaCliOutput {
    status: ExitStatus,
    stdout: String,
    stderr: String,
}

fn capture_llama_cli_output(
    request: &LlamaCliRequest,
    working_dir: Option<&Path>,
    started_at: Instant,
) -> Result<CapturedLlamaCliOutput, RuntimeError> {
    let args = build_llama_cli_args_for_request(request);
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
                Some(request.launch_fingerprint(working_dir)),
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
                Some(request.launch_fingerprint(working_dir)),
            ));
        }
    };

    let stdout_rx = spawn_capture_reader(stdout);
    let stderr_rx = spawn_capture_reader(stderr);

    let status = loop {
        if let Some(status) = child.try_wait().map_err(runtime_wait_error)? {
            break status;
        }

        if started_at.elapsed() >= request.timeout {
            let _ = child.kill();
            let _ = child.wait();
            let _ = collect_capture_reader(stdout_rx);
            let _ = collect_capture_reader(stderr_rx);

            return Err(RuntimeError::recoverable(
                "sidecar_timeout",
                "The local llama.cpp sidecar timed out.",
                "Try a shorter prompt or lower token limit.",
                Some(format!(
                    "timeoutMs={}; {}",
                    request.timeout.as_millis(),
                    request.launch_fingerprint(working_dir)
                )),
            ));
        }

        thread::sleep(Duration::from_millis(25));
    };

    let _ = child.wait().map_err(runtime_wait_error)?;
    let stdout = collect_capture_reader(stdout_rx)?;
    let stderr = collect_capture_reader(stderr_rx)?;

    Ok(CapturedLlamaCliOutput {
        status,
        stdout,
        stderr,
    })
}

fn spawn_capture_reader(mut stream: impl Read + Send + 'static) -> mpsc::Receiver<Vec<u8>> {
    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let mut buffer = Vec::new();
        let mut chunk = [0_u8; 1024];
        loop {
            match stream.read(&mut chunk) {
                Ok(0) => break,
                Ok(bytes_read) => buffer.extend_from_slice(&chunk[..bytes_read]),
                Err(_) => break,
            }
        }
        let _ = sender.send(buffer);
    });
    receiver
}

fn collect_capture_reader(receiver: mpsc::Receiver<Vec<u8>>) -> Result<String, RuntimeError> {
    let bytes = receiver
        .recv_timeout(Duration::from_secs(2))
        .map_err(|error| {
            RuntimeError::recoverable(
                "sidecar_capture_failed",
                "Cyro could not capture the local sidecar output.",
                "Retry after confirming the sidecar path is valid.",
                Some(error.to_string()),
            )
        })?;

    Ok(String::from_utf8_lossy(&bytes).to_string())
}

fn runtime_wait_error(error: std::io::Error) -> RuntimeError {
    RuntimeError::recoverable(
        "sidecar_wait_failed",
        "Cyro could not read the local sidecar process result.",
        "Retry the prompt after confirming the sidecar path is valid.",
        Some(error.to_string()),
    )
}

pub(crate) fn cleanup_stdout(stdout: &str, prompt: &str) -> String {
    let cleaned = normalize_terminal_output(stdout);
    let prompt = prompt.trim();
    let prompt_present = !prompt.is_empty() && cleaned.contains(prompt);
    let mut after_prompt = !prompt_present;
    let mut in_available_commands = false;
    let mut answer_lines = Vec::new();

    for raw_line in cleaned.lines() {
        let trimmed = raw_line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if is_available_commands_header(trimmed) {
            in_available_commands = true;
            continue;
        }

        if in_available_commands {
            if is_repl_command_line(trimmed) {
                continue;
            }
            in_available_commands = false;
        }

        if is_llama_decoration_line(trimmed) {
            continue;
        }

        if let Some(remainder) = prompt_line_remainder(trimmed, prompt) {
            after_prompt = true;
            if let Some(answer) = answer_line_from_candidate(&remainder, prompt) {
                answer_lines.push(answer);
            }
            continue;
        }

        if !after_prompt {
            continue;
        }

        if let Some(answer) = answer_line_from_candidate(trimmed, prompt) {
            answer_lines.push(answer);
        }
    }

    answer_lines.join("\n").trim().to_string()
}

pub(crate) fn empty_stdout_debug(stdout: &str, stderr: &str, prompt: &str) -> String {
    let stderr = sanitize_debug_output(stderr, prompt);
    let stderr_shape = stream_shape("stderr", stderr.as_str(), prompt);
    if stderr.trim().is_empty() {
        format!(
            "{}; {}",
            stdout_shape_diagnostics(stdout, prompt),
            stderr_shape
        )
    } else {
        format!(
            "{}; {}; stderr={}",
            stdout_shape_diagnostics(stdout, prompt),
            stderr_shape,
            stderr
        )
    }
}

pub(crate) fn stdout_shape_diagnostics(stdout: &str, prompt: &str) -> String {
    stream_shape("stdout", stdout, prompt)
}

pub(crate) fn extract_elapsed_ms_from_debug(debug: &str) -> Option<u64> {
    let elapsed_marker = "elapsedMs=";
    let start = debug.find(elapsed_marker)? + elapsed_marker.len();
    let value = debug[start..]
        .chars()
        .take_while(|ch| ch.is_ascii_digit())
        .collect::<String>();

    value.parse().ok()
}

fn stream_shape(label: &str, output: &str, prompt: &str) -> String {
    let cleaned = normalize_terminal_output(output);
    let prompt = prompt.trim();
    let mut blank_lines = 0;
    let mut prompt_marker_lines = 0;
    let mut timing_lines = 0;
    let mut command_lines = 0;
    let mut metadata_lines = 0;
    let mut exiting_lines = 0;
    let mut answer_candidate_lines = 0;
    let mut total_lines = 0;
    let mut non_empty_lines = 0;
    let mut first_non_empty: Option<String> = None;
    let mut last_non_empty: Option<String> = None;
    let mut timing_footer_found = false;

    for raw_line in cleaned.lines() {
        total_lines += 1;
        let trimmed = raw_line.trim();
        if trimmed.is_empty() {
            blank_lines += 1;
            continue;
        }

        non_empty_lines += 1;
        let safe_line = sanitize_debug_line(trimmed, prompt);
        if first_non_empty.is_none() {
            first_non_empty = Some(safe_line.clone());
        }
        last_non_empty = Some(safe_line);

        if prompt_line_remainder(trimmed, prompt).is_some() || is_prompt_shell_line(trimmed) {
            prompt_marker_lines += 1;
        } else if is_timing_line(trimmed) {
            timing_lines += 1;
            timing_footer_found = true;
        } else if is_repl_command_line(trimmed) {
            command_lines += 1;
        } else if is_metadata_or_banner_line(trimmed) || is_available_commands_header(trimmed) {
            metadata_lines += 1;
        } else if trimmed == "Exiting..." {
            exiting_lines += 1;
        } else if answer_line_from_candidate(trimmed, prompt).is_some() {
            answer_candidate_lines += 1;
        }
    }

    format!(
        "{label}Shape=bytes:{},lines:{total_lines},nonEmpty:{non_empty_lines},blank:{blank_lines},promptMarkers:{prompt_marker_lines},timing:{timing_lines},timingFooterFound:{timing_footer_found},commands:{command_lines},metadata:{metadata_lines},exiting:{exiting_lines},answerCandidates:{answer_candidate_lines},first:{},last:{}",
        output.len(),
        first_non_empty.unwrap_or_else(|| "[none]".to_string()),
        last_non_empty.unwrap_or_else(|| "[none]".to_string())
    )
}

fn sanitize_debug_line(line: &str, prompt: &str) -> String {
    let redacted = sanitize_debug_output(line, prompt);
    redacted
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(180)
        .collect()
}

pub(crate) fn sanitize_debug_output(output: &str, prompt: &str) -> String {
    let redacted = if prompt.trim().is_empty() {
        output.to_string()
    } else {
        output.replace(prompt.trim(), "[prompt redacted]")
    };

    redacted.chars().take(MAX_DEBUG_CHARS).collect()
}

fn normalize_terminal_output(output: &str) -> String {
    let mut normalized = String::new();
    let output = output.replace("\r\n", "\n").replace('\r', "\n");
    let mut chars = output.chars().peekable();

    while let Some(ch) = chars.next() {
        if ch == '\u{1b}' {
            if chars.peek() == Some(&'[') {
                let _ = chars.next();
                while let Some(next) = chars.next() {
                    if ('@'..='~').contains(&next) {
                        break;
                    }
                }
            } else {
                while let Some(next) = chars.next() {
                    if ('@'..='~').contains(&next) {
                        break;
                    }
                }
            }
            continue;
        }

        if ch == '\u{8}' {
            normalized.pop();
            continue;
        }

        if ch.is_control() && ch != '\n' && ch != '\t' {
            continue;
        }

        normalized.push(ch);
    }

    normalized
}

fn prompt_line_remainder(line: &str, prompt: &str) -> Option<String> {
    if prompt.is_empty() {
        return None;
    }

    let without_marker = line.strip_prefix('>').map(str::trim).unwrap_or(line);
    without_marker.find(prompt).map(|prompt_start| {
        without_marker[prompt_start + prompt.len()..]
            .trim()
            .to_string()
    })
}

fn answer_line_from_candidate(line: &str, prompt: &str) -> Option<String> {
    let candidate = strip_inline_decorations(line).trim();
    if candidate.is_empty() || is_llama_decoration_line(candidate) {
        return None;
    }

    let candidate = candidate
        .strip_prefix('>')
        .map(str::trim)
        .unwrap_or(candidate);
    let candidate = strip_inline_decorations(candidate).trim();
    if candidate.is_empty() {
        return None;
    }

    if let Some(remainder) = prompt_line_remainder(candidate, prompt) {
        return answer_line_from_candidate(&remainder, prompt);
    }

    if is_llama_decoration_line(candidate) {
        None
    } else {
        Some(candidate.to_string())
    }
}

fn strip_inline_decorations(line: &str) -> &str {
    let mut end = line.len();
    for marker in ["[ Prompt:", "Exiting..."] {
        if let Some(index) = line.find(marker) {
            end = end.min(index);
        }
    }

    line[..end].trim()
}

fn is_llama_decoration_line(line: &str) -> bool {
    line.is_empty()
        || line == "Exiting..."
        || line == "Loading model..."
        || is_available_commands_header(line)
        || is_repl_command_line(line)
        || is_prompt_shell_line(line)
        || is_timing_line(line)
        || is_metadata_or_banner_line(line)
}

fn is_available_commands_header(line: &str) -> bool {
    line.eq_ignore_ascii_case("available commands:")
}

fn is_repl_command_line(line: &str) -> bool {
    matches!(
        line.trim_start(),
        value if value.starts_with("/exit")
            || value.starts_with("/regen")
            || value.starts_with("/clear")
            || value.starts_with("/read")
            || value.starts_with("/glob")
    )
}

fn is_prompt_shell_line(line: &str) -> bool {
    line == ">"
}

fn is_timing_line(line: &str) -> bool {
    line.starts_with("[ Prompt:") && line.contains("| Generation:")
}

fn is_metadata_or_banner_line(line: &str) -> bool {
    line.starts_with("build      :")
        || line.starts_with("model      :")
        || line.starts_with("modalities :")
        || line.starts_with("llama.cpp")
        || is_ascii_logo_line(line)
}

fn is_ascii_logo_line(line: &str) -> bool {
    let mut saw_logo_char = false;
    for ch in line.chars() {
        if matches!(ch, '▄' | '█' | '▀') {
            saw_logo_char = true;
            continue;
        }

        if ch.is_whitespace() {
            continue;
        }

        return false;
    }

    saw_logo_char
}

fn elapsed_ms(started_at: Instant) -> u64 {
    u64::try_from(started_at.elapsed().as_millis()).unwrap_or(u64::MAX)
}

pub(crate) fn dev_cpu_fallback_enabled() -> bool {
    matches!(
        std::env::var("CYRO_LLAMA_CLI_CPU_FALLBACK")
            .unwrap_or_default()
            .trim()
            .to_ascii_lowercase()
            .as_str(),
        "1" | "true" | "yes" | "cpu" | "none"
    )
}

#[cfg(test)]
mod tests {
    use super::{
        build_llama_cli_args, build_llama_cli_args_for_request, llama_cli_working_dir,
        run_llama_cli_prompt, sanitize_max_tokens, FinishReason, LlamaCliRequest,
        RuntimeBackendMode,
    };
    use std::{
        fs,
        path::{Path, PathBuf},
        time::{Duration, SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn builds_structured_llama_cli_args_without_shell_string() {
        let args = build_llama_cli_args("/models/qwen.gguf", "hello; rm -rf /", 120);

        assert_eq!(
            args,
            vec![
                "-m",
                "/models/qwen.gguf",
                "-p",
                "hello; rm -rf /",
                "-n",
                "120",
                "--single-turn"
            ]
        );
    }

    #[test]
    fn derives_llama_cli_working_dir_from_binary_parent() {
        let working_dir = llama_cli_working_dir("/tools/llama.cpp/build/bin/llama-cli")
            .expect("absolute binary path should have a parent");

        assert_eq!(working_dir, PathBuf::from("/tools/llama.cpp/build/bin"));
    }

    #[test]
    fn cpu_fallback_adds_explicit_device_none_without_shell_args() {
        let request = LlamaCliRequest {
            binary_path: "/tools/llama-cli".to_string(),
            model_path: "/models/qwen.gguf".to_string(),
            prompt: "hello".to_string(),
            max_tokens: 24,
            timeout: Duration::from_secs(5),
            backend_mode: RuntimeBackendMode::Cpu,
        };

        assert_eq!(
            build_llama_cli_args_for_request(&request),
            vec![
                "-m",
                "/models/qwen.gguf",
                "-p",
                "hello",
                "-n",
                "24",
                "--single-turn",
                "--device",
                "none"
            ]
        );
        assert!(!build_llama_cli_args_for_request(&request).contains(&"-ngl".to_string()));
    }

    #[test]
    fn auto_backend_mode_does_not_add_cpu_fallback_args() {
        let request = LlamaCliRequest {
            binary_path: "/tools/llama-cli".to_string(),
            model_path: "/models/qwen.gguf".to_string(),
            prompt: "hello".to_string(),
            max_tokens: 24,
            timeout: Duration::from_secs(5),
            backend_mode: RuntimeBackendMode::Auto,
        };

        assert_eq!(
            build_llama_cli_args_for_request(&request),
            vec![
                "-m",
                "/models/qwen.gguf",
                "-p",
                "hello",
                "-n",
                "24",
                "--single-turn"
            ]
        );
    }

    #[test]
    fn cleanup_stdout_removes_llama_banner_prompt_and_exit_text() {
        let stdout = r#"
Loading model...

build      : b9162-d52844458
model      : qwen2.5-0.5b-instruct-q4_k_m.gguf

available commands:
  /exit or Ctrl+C     stop or exit

> Answer in 1 sentence: what is PostgreSQL PITR?

PostgreSQL PITR restores a database to a chosen point in time using base backups and WAL archives.

Exiting...
"#;

        let cleaned =
            super::cleanup_stdout(stdout, "Answer in 1 sentence: what is PostgreSQL PITR?");

        assert_eq!(
            cleaned,
            "PostgreSQL PITR restores a database to a chosen point in time using base backups and WAL archives."
        );
    }

    #[test]
    fn cleanup_stdout_extracts_repl_prefixed_answer_without_decorations() {
        let prompt = "Say hello in one sentence.";
        let stdout = format!(
            "Loading model...\n\n▄▄ ▄▄\n██ ██\n\nbuild      : b9162-d52844458\nmodel      : qwen2.5-0.5b-instruct-q4_k_m.gguf\nmodalities : text\n\navailable commands:\n  /exit or Ctrl+C     stop or exit\n  /regen              regenerate the last response\n  /clear              clear the chat history\n  /read <file>        add a text file\n  /glob <pattern>     add text files using globbing pattern\n\n> {prompt}\n\n> Hello! How may I assist you today?\n\n[ Prompt: 346.6 t/s | Generation: 115.0 t/s ]\n\n>\n\nExiting...\n"
        );

        let cleaned = super::cleanup_stdout(&stdout, prompt);

        assert_eq!(cleaned, "Hello! How may I assist you today?");
    }

    #[test]
    fn cleanup_stdout_normalizes_terminal_progress_control_chars() {
        let prompt = "Say hello in one sentence.";
        let stdout = format!(
            "Loading model...\n\n> {prompt}\n\n|\u{8} \u{8}Hello! It's a pleasure to meet you!\n\n[ Prompt: 1.0 t/s | Generation: 2.0 t/s ]\nExiting...\n"
        );

        let cleaned = super::cleanup_stdout(&stdout, prompt);

        assert_eq!(cleaned, "Hello! It's a pleasure to meet you!");
    }

    #[test]
    fn cleanup_stdout_extracts_benchmark_output_with_progress_spinner() {
        let prompt = "Answer with exactly three short bullets about what local inference means.";
        let stdout = format!(
            "Loading model... |\u{8}-\u{8}\\\u{8}|\u{8}/\u{8} \u{8}\n\n\n▄▄ ▄▄\n██ ██\n\nbuild      : b9162-d52844458\nmodel      : qwen2.5-0.5b-instruct-q4_k_m.gguf\nmodalities : text\n\navailable commands:\n  /exit or Ctrl+C     stop or exit\n  /regen              regenerate the last response\n  /clear              clear the chat history\n  /read <file>        add a text file\n  /glob <pattern>     add text files using globbing pattern\n\n\n> {prompt}\n\n|\u{8}-\u{8} \u{8}Local inference means a model runs on this device.\n- It avoids provider or cloud calls for that request.\n- It depends on local hardware, model, and runtime limits.\n\n[ Prompt: 321.7 t/s | Generation: 114.1 t/s ]\n\nExiting...\n"
        );

        let cleaned = super::cleanup_stdout(&stdout, prompt);

        assert_eq!(
            cleaned,
            "Local inference means a model runs on this device.\n- It avoids provider or cloud calls for that request.\n- It depends on local hardware, model, and runtime limits."
        );
    }

    #[test]
    fn cleanup_stdout_strips_inline_timing_footer_without_dropping_answer() {
        let prompt = "Say hello in one sentence.";
        let stdout = format!(
            "> {prompt}\nHello from Cyro. [ Prompt: 10.0 t/s | Generation: 20.0 t/s ]\nExiting...\n"
        );

        let cleaned = super::cleanup_stdout(&stdout, prompt);

        assert_eq!(cleaned, "Hello from Cyro.");
    }

    #[test]
    fn stdout_shape_diagnostics_are_bounded_and_prompt_free() {
        let prompt = "private prompt";
        let stdout = format!(
            "Loading model...\n\navailable commands:\n  /exit or Ctrl+C     stop or exit\n\n> {prompt}\n\n[ Prompt: 1.0 t/s | Generation: 2.0 t/s ]\nExiting...\n"
        );

        let diagnostics = super::stdout_shape_diagnostics(&stdout, prompt);

        assert!(diagnostics.contains("stdoutShape="));
        assert!(diagnostics.contains("promptMarkers:1"));
        assert!(diagnostics.contains("timing:1"));
        assert!(diagnostics.contains("timingFooterFound:true"));
        assert!(diagnostics.contains("first:Loading model"));
        assert!(diagnostics.contains("last:Exiting"));
        assert!(!diagnostics.contains(prompt));
    }

    #[test]
    fn elapsed_ms_is_extractable_from_safe_debug_detail() {
        assert_eq!(
            super::extract_elapsed_ms_from_debug("elapsedMs=1640; stdoutShape=bytes:10,lines:1"),
            Some(1640)
        );
        assert_eq!(
            super::extract_elapsed_ms_from_debug("stdoutShape=bytes:0"),
            None
        );
    }

    #[test]
    fn max_tokens_are_conservative_and_bounded() {
        assert_eq!(sanitize_max_tokens(None), 120);
        assert_eq!(sanitize_max_tokens(Some(0)), 1);
        assert_eq!(sanitize_max_tokens(Some(999)), 256);
    }

    #[test]
    fn nonzero_exit_returns_actionable_runtime_error() {
        let sandbox = TestSandbox::new("nonzero");
        let binary = sandbox.write_executable("llama-cli", "#!/bin/sh\necho failed >&2\nexit 7\n");
        let request = LlamaCliRequest {
            binary_path: path_str(&binary).to_string(),
            model_path: "/tmp/model.gguf".to_string(),
            prompt: "private prompt".to_string(),
            max_tokens: 8,
            timeout: Duration::from_secs(5),
            backend_mode: RuntimeBackendMode::Auto,
        };

        let error = run_llama_cli_prompt(&request).expect_err("nonzero script should fail");

        assert_eq!(error.code, "sidecar_exit_failed");
        assert!(error.recoverable);
        assert!(error
            .debug_detail_safe
            .as_deref()
            .unwrap_or_default()
            .contains("exitStatus="));
        assert!(!error
            .debug_detail_safe
            .as_deref()
            .unwrap_or_default()
            .contains("private prompt"));
    }

    #[test]
    fn empty_success_exit_returns_empty_output_with_exit_diagnostics() {
        let sandbox = TestSandbox::new("empty_success");
        let binary = sandbox.write_executable("llama-cli", "#!/bin/sh\nexit 0\n");
        let request = LlamaCliRequest {
            binary_path: path_str(&binary).to_string(),
            model_path: "/tmp/model.gguf".to_string(),
            prompt: "private prompt".to_string(),
            max_tokens: 8,
            timeout: Duration::from_secs(5),
            backend_mode: RuntimeBackendMode::Auto,
        };

        let error = run_llama_cli_prompt(&request).expect_err("empty success should fail safely");
        let debug = error.debug_detail_safe.as_deref().unwrap_or_default();

        assert_eq!(error.code, "sidecar_empty_output");
        assert!(debug.contains("exitStatus="));
        assert!(debug.contains("elapsedMs="));
        assert!(debug.contains("stdoutShape=bytes:0"));
        assert!(debug.contains("stderrShape=bytes:0"));
        assert!(!debug.contains("private prompt"));
    }

    #[test]
    fn direct_capture_collects_stdout_from_successful_child() {
        let sandbox = TestSandbox::new("direct_capture");
        let binary = sandbox.write_executable(
            "llama-cli",
            "#!/bin/sh\nprintf 'private prompt\\n'\nprintf 'captured answer from sidecar\\n'\nprintf 'stderr diagnostic' >&2\nexit 0\n",
        );
        let request = LlamaCliRequest {
            binary_path: path_str(&binary).to_string(),
            model_path: "/tmp/model.gguf".to_string(),
            prompt: "private prompt".to_string(),
            max_tokens: 8,
            timeout: Duration::from_secs(5),
            backend_mode: RuntimeBackendMode::Auto,
        };

        let output = run_llama_cli_prompt(&request).expect("stdout should be captured");

        assert_eq!(output.response, "captured answer from sidecar");
        assert_eq!(output.finish_reason, FinishReason::Completed);
    }

    #[test]
    fn empty_failed_exit_returns_exit_failed_with_empty_output_diagnostics() {
        let sandbox = TestSandbox::new("empty_failed");
        let binary = sandbox.write_executable("llama-cli", "#!/bin/sh\nexit 7\n");
        let request = LlamaCliRequest {
            binary_path: path_str(&binary).to_string(),
            model_path: "/tmp/model.gguf".to_string(),
            prompt: "private prompt".to_string(),
            max_tokens: 8,
            timeout: Duration::from_secs(5),
            backend_mode: RuntimeBackendMode::Auto,
        };

        let error = run_llama_cli_prompt(&request).expect_err("empty failure should fail safely");
        let debug = error.debug_detail_safe.as_deref().unwrap_or_default();

        assert_eq!(error.code, "sidecar_exit_failed");
        assert!(debug.contains("exitStatus="));
        assert!(debug.contains("elapsedMs="));
        assert!(debug.contains("stdoutShape=bytes:0"));
        assert!(debug.contains("stderrShape=bytes:0"));
        assert!(!debug.contains("private prompt"));
    }

    #[test]
    fn timeout_kills_process_and_returns_runtime_error() {
        let sandbox = TestSandbox::new("timeout");
        let binary = sandbox.write_executable("llama-cli", "#!/bin/sh\nsleep 2\necho late\n");
        let request = LlamaCliRequest {
            binary_path: path_str(&binary).to_string(),
            model_path: "/tmp/model.gguf".to_string(),
            prompt: "hello".to_string(),
            max_tokens: 8,
            timeout: Duration::from_millis(25),
            backend_mode: RuntimeBackendMode::Auto,
        };

        let error = run_llama_cli_prompt(&request).expect_err("sleeping script should time out");

        assert_eq!(error.code, "sidecar_timeout");
        assert!(error.user_action.contains("shorter prompt"));
    }

    #[test]
    #[ignore]
    fn manual_llama_cli_prompt_from_env() {
        let binary_path = std::env::var("CYRO_TEST_LLAMA_CLI_PATH")
            .expect("CYRO_TEST_LLAMA_CLI_PATH must point to llama-cli");
        let model_path =
            std::env::var("CYRO_TEST_MODEL_PATH").expect("CYRO_TEST_MODEL_PATH must point to GGUF");
        let request = LlamaCliRequest::new(
            binary_path,
            model_path,
            "Answer in 3 bullets: what is PostgreSQL PITR?".to_string(),
            64,
        );

        let output = run_llama_cli_prompt(&request).expect("manual sidecar prompt should run");

        assert!(!output.response.trim().is_empty());
    }

    #[test]
    #[ignore]
    fn manual_llama_cli_benchmark_prompt_from_env() {
        let binary_path = std::env::var("CYRO_TEST_LLAMA_CLI_PATH")
            .expect("CYRO_TEST_LLAMA_CLI_PATH must point to llama-cli");
        let model_path =
            std::env::var("CYRO_TEST_MODEL_PATH").expect("CYRO_TEST_MODEL_PATH must point to GGUF");
        let request = LlamaCliRequest::new(
            binary_path,
            model_path,
            "Answer with exactly three short bullets about what local inference means.".to_string(),
            80,
        );

        let output =
            run_llama_cli_prompt(&request).expect("manual benchmark prompt should extract text");

        assert!(!output.response.trim().is_empty());
        assert!(output.elapsed_ms > 0);
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
                "cyro-llama-cli-{label}-{}-{nanos}",
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
