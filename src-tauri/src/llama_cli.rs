use std::{
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

use crate::runtime_types::{FinishReason, RuntimeError};

const DEFAULT_PROMPT_TIMEOUT_SECS: u64 = 60;
pub(crate) const MAX_DEBUG_CHARS: usize = 1_200;
const LLAMA_CLI_ONE_SHOT_ARGS: [&str; 1] = ["--single-turn"];

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LlamaCliRequest {
    pub binary_path: String,
    pub model_path: String,
    pub prompt: String,
    pub max_tokens: u32,
    pub timeout: Duration,
    pub cpu_fallback: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LlamaCliOutput {
    pub response: String,
    pub elapsed_ms: u64,
    pub finish_reason: FinishReason,
}

impl LlamaCliRequest {
    pub fn new(binary_path: String, model_path: String, prompt: String, max_tokens: u32) -> Self {
        Self {
            binary_path,
            model_path,
            prompt,
            max_tokens,
            timeout: Duration::from_secs(DEFAULT_PROMPT_TIMEOUT_SECS),
            cpu_fallback: dev_cpu_fallback_enabled(),
        }
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
    if request.cpu_fallback {
        args.extend(["--device".to_string(), "none".to_string()]);
    }
    args
}

pub(crate) fn llama_cli_working_dir(binary_path: &str) -> Option<PathBuf> {
    Path::new(binary_path).parent().map(Path::to_path_buf)
}

pub fn run_llama_cli_prompt(request: &LlamaCliRequest) -> Result<LlamaCliOutput, RuntimeError> {
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

    loop {
        if child.try_wait().map_err(runtime_wait_error)?.is_some() {
            let output = child.wait_with_output().map_err(runtime_wait_error)?;
            let elapsed_ms = elapsed_ms(started_at);

            if !output.status.success() {
                return Err(RuntimeError::recoverable(
                    "sidecar_exit_failed",
                    "The local llama.cpp sidecar exited with an error.",
                    "Check the configured model path and try a shorter local prompt.",
                    Some(format!(
                        "exit={}; stderr={}",
                        output.status,
                        sanitize_debug_output(
                            &String::from_utf8_lossy(&output.stderr),
                            &request.prompt
                        )
                    )),
                ));
            }

            let response =
                cleanup_stdout(&String::from_utf8_lossy(&output.stdout), &request.prompt);
            if response.is_empty() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(RuntimeError::recoverable(
                    "sidecar_empty_response",
                    "The local llama.cpp sidecar returned no text.",
                    "Try a shorter prompt or a different validated GGUF model.",
                    Some(empty_stdout_debug(&stdout, &stderr, &request.prompt)),
                ));
            }

            return Ok(LlamaCliOutput {
                response,
                elapsed_ms,
                finish_reason: FinishReason::Completed,
            });
        }

        if started_at.elapsed() >= request.timeout {
            let _ = child.kill();
            let _ = child.wait();

            return Err(RuntimeError::recoverable(
                "sidecar_timeout",
                "The local llama.cpp sidecar timed out.",
                "Try a shorter prompt or lower token limit.",
                Some(format!("timeoutMs={}", request.timeout.as_millis())),
            ));
        }

        thread::sleep(Duration::from_millis(25));
    }
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

    answer_lines
        .join("\n")
        .trim()
        .to_string()
}

pub(crate) fn empty_stdout_debug(stdout: &str, stderr: &str, prompt: &str) -> String {
    let stderr = sanitize_debug_output(stderr, prompt);
    if stderr.trim().is_empty() {
        stdout_shape_diagnostics(stdout, prompt)
    } else {
        format!(
            "{}; stderr={}",
            stdout_shape_diagnostics(stdout, prompt),
            stderr
        )
    }
}

pub(crate) fn stdout_shape_diagnostics(stdout: &str, prompt: &str) -> String {
    let cleaned = normalize_terminal_output(stdout);
    let prompt = prompt.trim();
    let mut blank_lines = 0;
    let mut prompt_marker_lines = 0;
    let mut timing_lines = 0;
    let mut command_lines = 0;
    let mut metadata_lines = 0;
    let mut exiting_lines = 0;
    let mut answer_candidate_lines = 0;
    let mut total_lines = 0;

    for raw_line in cleaned.lines() {
        total_lines += 1;
        let trimmed = raw_line.trim();
        if trimmed.is_empty() {
            blank_lines += 1;
        } else if prompt_line_remainder(trimmed, prompt).is_some() || is_prompt_shell_line(trimmed) {
            prompt_marker_lines += 1;
        } else if is_timing_line(trimmed) {
            timing_lines += 1;
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
        "stdoutShape=bytes:{},lines:{total_lines},blank:{blank_lines},promptMarkers:{prompt_marker_lines},timing:{timing_lines},commands:{command_lines},metadata:{metadata_lines},exiting:{exiting_lines},answerCandidates:{answer_candidate_lines}",
        stdout.len()
    )
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
    let output = output.replace("\r\n", "\n");
    let mut chars = output.chars().peekable();

    while let Some(ch) = chars.next() {
        if ch == '\u{1b}' {
            while let Some(next) = chars.next() {
                if ('@'..='~').contains(&next) {
                    break;
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
    without_marker
        .find(prompt)
        .map(|prompt_start| without_marker[prompt_start + prompt.len()..].trim().to_string())
}

fn answer_line_from_candidate(line: &str, prompt: &str) -> Option<String> {
    let candidate = line.trim();
    if candidate.is_empty() || is_llama_decoration_line(candidate) {
        return None;
    }

    let candidate = candidate.strip_prefix('>').map(str::trim).unwrap_or(candidate);
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
        run_llama_cli_prompt, sanitize_max_tokens, LlamaCliRequest,
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
            timeout: Duration::from_secs(2),
            cpu_fallback: true,
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
    fn stdout_shape_diagnostics_are_bounded_and_prompt_free() {
        let prompt = "private prompt";
        let stdout = format!(
            "Loading model...\n\navailable commands:\n  /exit or Ctrl+C     stop or exit\n\n> {prompt}\n\n[ Prompt: 1.0 t/s | Generation: 2.0 t/s ]\nExiting...\n"
        );

        let diagnostics = super::stdout_shape_diagnostics(&stdout, prompt);

        assert!(diagnostics.contains("stdoutShape="));
        assert!(diagnostics.contains("promptMarkers:1"));
        assert!(diagnostics.contains("timing:1"));
        assert!(!diagnostics.contains(prompt));
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
            timeout: Duration::from_secs(2),
            cpu_fallback: false,
        };

        let error = run_llama_cli_prompt(&request).expect_err("nonzero script should fail");

        assert_eq!(error.code, "sidecar_exit_failed");
        assert!(error.recoverable);
        assert!(!error
            .debug_detail_safe
            .as_deref()
            .unwrap_or_default()
            .contains("private prompt"));
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
            cpu_fallback: false,
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
