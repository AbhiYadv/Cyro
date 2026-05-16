# ADR: Local Brain Runtime via llama.cpp Sidecar

## Status

Proposed for Phase 1 implementation planning.

## Decision

Cyro Phase 1 Local Brain will integrate local GGUF inference through a supervised `llama.cpp sidecar` process first.

The Phase 1 runtime path is:

Cyro React UI -> Rust/Tauri command boundary -> Runtime Governor -> supervised llama.cpp sidecar -> local GGUF model file

This ADR does not implement the sidecar, ship binaries, add model files, download models, add Rust FFI, add Python, or add product code.

## Rejected Alternatives

### Direct Rust FFI

Direct Rust FFI to llama.cpp is rejected for Phase 1.

Reasons:
- larger unsafe boundary
- harder packaging and platform isolation
- higher crash impact inside the main Tauri process
- slower iteration for first local inference contract
- more complex cancellation and recovery behavior

Direct FFI can be reconsidered only after the sidecar contract is proven.

### Python Runtime

Python runtime is rejected for the packaged app.

Reasons:
- larger distribution surface
- harder dependency isolation
- startup and packaging complexity
- harder security review
- inconsistent desktop install behavior

### Cloud Fallback

Cloud fallback is rejected for Local Brain.

Reasons:
- Local Brain must work offline
- prompt privacy must remain local by default
- cloud calls would violate the Phase 1 trust boundary
- provider/cloud routing requires separate explicit user approval and architecture

No cloud fallback is allowed for Local Brain runtime errors.

## Sidecar Process Boundary

Rust owns runtime authority.

React may request runtime actions through typed Tauri commands only. React must not:
- launch the sidecar
- construct shell commands
- access the model process directly
- read model files
- stream prompts outside the command boundary
- store secrets or privileged runtime state

Rust/Tauri must:
- validate model paths
- map runtime commands to supervised process actions
- launch and supervise the sidecar
- track process state
- enforce cancellation/kill strategy
- sanitize errors for UI display
- avoid logging prompt content by default
- reject invalid state transitions

The sidecar must:
- use only local filesystem model paths
- never make cloud calls
- reject missing or invalid model paths
- return actionable runtime errors when startup or generation fails
- support cancellation or process termination before streaming work begins
- avoid prompt content in logs by default

## Sidecar Binary Discovery Strategy

CYRO-0005 defines discovery strategy and a mocked sidecar status contract only. It does not execute the binary, run inference, load models, or validate model paths.

Binary sources:
- `development_override_path`: user or developer configured local path.
- `standard_dev_path`: local development checkout such as `tools/llama.cpp/build/bin/llama-cli`; this path is not committed.
- `future_bundled_sidecar_path`: packaged app resource path after an explicit packaging task.
- `not_supported_yet`: automatic download.

No auto-download is allowed in CYRO-0005.

Binary names to consider:
- `llama-cli`
- `llama-server`

First phase preference:
- `llama-cli` is the first target for one-shot local prompt proof.
- `llama-server` may be evaluated later for streaming/server mode.

Discovery authority:
- Rust/Tauri owns discovery and validation.
- Frontend must not discover, probe, execute, or validate sidecar binaries.
- Frontend may show `SidecarBinaryStatus` and may later provide a candidate path only through an explicit file picker or config flow.

Validation gates for future tasks:
- path exists
- path is a file
- path is executable
- binary name is allowlisted
- version command can be called safely later
- path is not inside `node_modules`, `dist`, `.vite`, target output, or Git-tracked model folders
- path is not a shell string with arguments

Future execution rule:
- Rust must execute only an allowlisted sidecar binary with structured arguments.
- Rust must never execute arbitrary frontend-provided command strings.
- No prompt content may appear in sidecar discovery logs.

### SidecarBinaryConfig

Fields:
- `binaryId`
- `binaryKind`
- `configuredPath`
- `discoverySource`
- `validated`
- `version`
- `lastCheckedAt`

### SidecarBinaryStatus

Fields:
- `state`
- `binaryKind`
- `path`
- `version`
- `message`
- `recoverable`
- `userAction`

Status states:
- `not_configured`
- `path_missing`
- `not_executable`
- `unsupported_binary`
- `version_unknown`
- `available`
- `error`

### SidecarDiscoverySource

Values:
- `developer_override`
- `standard_dev_path`
- `bundled_resource_future`
- `not_configured`

### Sidecar Discovery Commands

Current mocked command:
- `get_sidecar_status`

Future commands:
- `validate_sidecar_path`
- `set_sidecar_path`

`get_sidecar_status` returns `not_configured` until a future validation task introduces safe path handling.

## Model Path and Registry Behavior

Phase 1 starts with a user-provided GGUF model path. Cyro does not commit model files and does not download model files in this phase.

CYRO-0006 implements model path validation and a placeholder model registry only. It does not load a model, execute llama.cpp, run inference, parse GGUF contents, compute model hashes, download models, or add durable registry persistence.

Model path rules:
- filesystem paths are validated by Rust
- arbitrary frontend URLs are rejected
- model file must exist
- extension and file metadata must match allowed GGUF expectations
- path must not be interpolated into a shell command
- invalid path returns a recoverable runtime error
- `.gguf` is the only supported model extension for the first Local Brain path validation task
- command-like strings, URL-like strings, and paths with shell arguments are rejected before filesystem lookup

Model registry behavior:
- `LocalModelConfig` records configured local models
- model files are outside Git
- registry stores metadata, validation status, and optional checksum only
- installed means "known and locally present", not "loaded"
- validated means Rust has checked file existence and metadata
- benchmark gates still apply before Runtime Governor selects the model
- CYRO-0006 uses an in-memory placeholder registry that can reset on app restart
- initial placeholder model id is `qwen-0_8b-local`

### ModelPathValidationResult

Fields:
- `valid`
- `state`
- `path`
- `fileName`
- `extension`
- `fileSizeMb`
- `readable`
- `isFile`
- `message`
- `recoverable`
- `userAction`

`ModelPathState` values:
- `not_configured`
- `path_missing`
- `not_file`
- `not_readable`
- `unsupported_extension`
- `valid_gguf`
- `error`

### ModelRegistryEntry

CYRO-0006 placeholder fields:
- `modelId`
- `displayName`
- `family`
- `parameterClass`
- `quantization`
- `filePath`
- `fileName`
- `contextWindow`
- `installed`
- `validated`
- `fileSizeMb`
- `minRamMb`
- `recommendedRamMb`
- `lastValidatedAt`

Current placeholder:
- `modelId`: `qwen-0_8b-local`
- `displayName`: `Qwen 0.8B Local`
- `family`: `qwen`
- `parameterClass`: `0.8B`
- `quantization`: `unknown_until_path_validated`
- `contextWindow`: `4096`
- `installed`: `false`
- `validated`: `false`
- `minRamMb`: `2048`
- `recommendedRamMb`: `4096`

## Runtime States

`RuntimeState` values:
- `not_configured`
- `model_missing`
- `model_available`
- `loading`
- `ready`
- `generating`
- `error`
- `unloaded`

State rules:
- `not_configured` means no model path is saved.
- `model_missing` means saved model path no longer resolves to a valid local GGUF file.
- `model_available` means the model path validates but the sidecar is not loaded.
- `loading` means Rust has started supervised sidecar startup.
- `ready` means the sidecar can accept a local prompt.
- `generating` means one prompt is in flight.
- `error` means the last runtime operation failed with a recoverable or non-recoverable `RuntimeError`.
- `unloaded` means the model was released or sidecar stopped intentionally.

## Runtime Modes

`RuntimeMode` values:
- `fast`
- `think`
- `pro`

Fast, Think, and Pro are route modes, not hardcoded model names. Runtime Governor maps each requested mode to a route and model based on capability, benchmark evidence, sidecar status, and user settings.

## Runtime Routes

`RuntimeRoute` values:
- `local_sidecar`
- `local_mock`
- `desktop_node_future`
- `vsn_future`
- `provider_external_future`

Phase 1 implementation route:
- `local_sidecar`

Demo baseline route:
- `local_mock`

Future routes:
- `desktop_node_future`
- `vsn_future`
- `provider_external_future`

Future routes are not implemented by this ADR. No silent offload is allowed.

## Runtime Commands

Command contracts:
- `get_runtime_status`
- `validate_model_path`
- `get_model_registry`
- `set_model_path`
- `validate_sidecar_path`
- `set_sidecar_path`
- `load_local_model`
- `unload_local_model`
- `send_local_prompt`
- `cancel_generation`
- `run_runtime_benchmark`

Command authority:
- React invokes commands.
- Rust validates inputs and owns runtime authority.
- Sidecar receives only validated local runtime work from Rust.

## CYRO-0007 First Non-Streaming Prompt Path

CYRO-0007 introduces the first optional real local GGUF prompt path through a Rust-supervised `llama-cli` process.

Behavior:
- if no sidecar path and no model path are configured, `send_local_prompt` keeps the `local_mock` fallback
- if a sidecar path is configured, Rust validates that it is a local executable `llama-cli`
- if a model path is configured, Rust validates that it is a readable local `.gguf` file
- when both paths are valid, Rust launches `llama-cli` with structured process arguments
- React never executes the binary, builds command strings, or owns runtime authority
- prompt content is not logged by default

CYRO-0007 process arguments:
- `-m <model_path>`
- `-p <prompt>`
- `-n <max_tokens>`

CYRO-0007 also adds fixed internal safety flags for the local `llama-cli` subprocess:
- `--single-turn`
- `--no-display-prompt`
- `--no-show-timings`
- `--simple-io`
- `--offline`

These flags are not user-controlled. They keep the first prompt path bounded, prevent the interactive console loop, reduce prompt echo in output, improve subprocess compatibility, and block `llama-cli` network/cache download behavior.

The first proof uses conservative max tokens with a default of `120` and an upper bound of `256`. The command has a timeout and returns actionable `RuntimeError` values for missing sidecar, invalid model, timeout, nonzero exit, empty response, or process wait failure.

Streaming is still future work. `llama-server`, token streaming, cancellation UX, partial output, richer process lifecycle state, and model lifecycle controls remain CYRO-0011 or later.

The provided tiny `0.5B` GGUF test model is a runtime proof only. Output quality from that test model is not representative of final Local Brain answer quality.

## CYRO-0008 Runtime Status and Manual Path Setup Flow

CYRO-0008 makes the CYRO-0007 sidecar route usable from the desktop shell without adding streaming, benchmark gates, model downloads, bundled binaries, or new inference modes.

Manual setup flow:
- user enters a local `llama-cli` path in the Runtime panel
- React sends the candidate path to Rust through `validate_sidecar_path`
- Rust validates the path, executable bit, binary name allowlist, and generated-directory exclusions
- if validation succeeds, React calls `set_sidecar_path` so Rust stores the validated path in runtime state
- user enters a local `.gguf` model path in the Runtime panel
- React sends the candidate path to Rust through `validate_model_path`
- Rust validates that the path is local, readable, a file, and `.gguf`
- if validation succeeds, React calls `set_model_path` so Rust stores metadata in the placeholder model registry

Runtime status behavior:
- `get_runtime_status` combines `SidecarBinaryStatus`, placeholder model registry state, and active route readiness
- when neither path is configured, status is `not_configured` and route is `local_mock`
- when only `llama-cli` is validated, status is `sidecar_ready` and route remains `local_mock`
- when only the model path is validated, status is `model_valid` and route remains `local_mock`
- when both are validated, status is `ready` and route is `local_sidecar`
- chat responses must show whether they came from `local_mock` or `local_sidecar`
- local sidecar responses include model id and elapsed time metadata where available

Runtime error UX:
- missing sidecar, missing model, invalid path, timeout, nonzero exit, and empty response remain user-actionable
- errors surface safe messages and user actions
- prompt content is not logged or shown in debug detail by default
- React does not validate filesystem paths and does not execute binaries

Streaming, cancellation controls, richer process lifecycle state, durable config persistence, model picker UX, and final Local Brain UX remain future tasks.

## CYRO-0009 Runtime Benchmark Gate

CYRO-0009 adds the first local-only benchmark gate for the validated `llama-cli` sidecar and `.gguf` model pair. It does not add streaming, `llama-server`, model downloads, bundled binaries, durable benchmark persistence, cloud fallback, or provider routing.

Benchmark behavior:
- user explicitly clicks `Run Benchmark`; no benchmark runs automatically on app startup
- Rust owns benchmark execution through the same sidecar authority boundary as `send_local_prompt`
- React never executes binaries, builds process arguments, or supplies arbitrary benchmark prompts
- Rust uses a fixed benchmark prompt: `Answer with exactly three short bullets about what local inference means.`
- benchmark process arguments are structured `Command` args, not shell strings
- default benchmark max tokens is `80`
- default benchmark timeout is `60000` ms
- results remain local and in memory for this task
- no telemetry upload or background benchmark loop exists

Initial development latency classes:
- `fast`: `elapsedMs <= 5000`
- `acceptable`: `elapsedMs > 5000` and `elapsedMs <= 15000`
- `slow`: `elapsedMs > 15000` and `elapsedMs <= 60000`
- `blocked`: missing config, invalid sidecar/model, timeout, nonzero exit, unsafe state, or elapsed time above the local window

The tiny local test model is useful for runtime proof and latency wiring only. It is not final answer-quality evidence.

Runtime Governor relationship:
- `get_runtime_status` exposes benchmark state when available
- a ready `local_sidecar` route without a benchmark shows a warning
- failed, slow, or blocked benchmark state is visible to the user
- Fast/Think/Pro routing does not fully depend on benchmark results yet
- future Runtime Governor tasks consume benchmark evidence for model and quantization selection

### Runtime Benchmark Contracts

`BenchmarkStatus` values:
- `not_run`
- `running`
- `passed`
- `slow`
- `failed`
- `blocked`

`LatencyClass` values:
- `fast`
- `acceptable`
- `slow`
- `blocked`
- `unknown`

`RuntimeBenchmarkRequest` fields:
- `modelId`
- `mode`
- `maxTokens`
- `timeoutMs`

`RuntimeBenchmarkResult` fields:
- `benchmarkId`
- `modelId`
- `modelFileName`
- `modelFileSizeMb`
- `route`
- `mode`
- `elapsedMs`
- `tokensPerSecondOptional`
- `latencyClass`
- `passed`
- `reason`
- `createdAt`

`RuntimeBenchmarkError` fields:
- `code`
- `message`
- `recoverable`
- `userAction`
- `debugDetailSafe`

## CYRO-0010 Local Model Candidate Evaluation

CYRO-0010 defines the local model candidate evaluation matrix. It does not download models, commit model files, switch runtime models automatically, add benchmark persistence, add cloud evaluation, or introduce LLM judge scoring.

The current 0.5B GGUF proof model is not the final default local brain. It is classified as `pipeline_only` because it proved the Rust-supervised sidecar path and benchmark plumbing, but failed technical answer quality on PostgreSQL PITR.

Model selection principle:
- do not select a default local brain based only on speed
- benchmark evidence is required for runtime suitability
- quality evidence is required for route suitability
- Fast/Think/Pro require benchmark and quality evidence before a candidate can become default

Candidate ladder:
- `0.5B`: pipeline proof only, route `none`
- `0.8B or nearest small Qwen instruct GGUF`: Fast candidate to evaluate
- `1.5B Q4/IQ`: Think candidate for capable phone/laptop
- `3B Q4/IQ`: future laptop/Pro candidate, benchmark-gated later

Quantization policy:
- `Q4_K_M` remains the first baseline for quality/speed comparisons
- `IQ4` and `IQ3` are advanced compression candidates after baseline comparison
- `Q2` and `IQ2` are utility/router/redaction/emergency fallback candidates only, not main answer models
- `Q5` and `Q8` are laptop-quality candidates only if benchmark and resource gates pass

Evaluation records must include latency, token estimate, cold start observation, manual memory observation, technical accuracy score, instruction following score, crispness score, recommended route, decision, and notes.

CYRO-0011 or a follow-up may test larger models manually using user-provided local GGUF paths. Those tests must not add model downloads, model files, model marketplace UX, or automatic model switching.

## CYRO-0011A Streaming and Cancel Contract

CYRO-0011A defines the streaming stdout and cancel/kill contract before implementation. It does not add streaming code, cancellation code, `llama-server`, model files, binaries, downloads, Rust FFI, Python, cloud APIs, provider APIs, or persistence.

Streaming strategy:
- CYRO-0011B should stream local sidecar stdout from Rust to React through Tauri events or an equivalent Rust-owned event channel.
- Initial streaming target is `llama-cli` stdout, not `llama-server`.
- React must not spawn, supervise, terminate, or directly control the sidecar process.
- Rust owns process lifecycle, stdout reading, stderr reading, timeout, cancellation, cleanup, and safe diagnostics.
- Streaming must be optional; the CYRO-0007 non-streaming `send_local_prompt` path remains the fallback.
- The same validated sidecar path and validated GGUF model path gates apply before streaming starts.

Generation concurrency:
- Only one local generation may run at a time in CYRO-0011B.
- `starting`, `streaming`, and `cancelling` are active states.
- A new prompt must not start until the previous generation completes, cancels, times out, or fails.
- Future queueing is out of scope.

Cancel strategy:
- `cancel_generation` targets the active child process owned by Rust.
- Cancel must move generation state to `cancelling`, then to `cancelled` after the child exits or is killed.
- Cancel must clear the app's generating state.
- Cancel returns a recoverable cancelled result, not an application crash.
- If graceful termination fails, Rust may force-kill the child process and return bounded safe debug detail.

Timeout strategy:
- Runtime must enforce a maximum generation timeout.
- Timeout must terminate or force-kill the child process.
- Timeout must clear generating state.
- Timeout result must be actionable and suggest a smaller model, fewer tokens, or retry.

Partial output strategy:
- Partial output may be shown while streaming.
- If cancelled, the UI may keep partial output labeled `cancelled`.
- If timeout occurs, the UI may keep partial output labeled `timed_out`.
- If the process fails before useful output, the UI shows an actionable `RuntimeError`.
- Partial output must not be written to memory automatically.

Stderr and diagnostics:
- Rust may capture stderr for safe diagnostics.
- Prompt content must not be logged by default.
- UI must not show large raw stderr dumps.
- `debugDetailSafe` must be bounded, prompt-redacted, and safe to display.

### GenerationState

Values:
- `idle`
- `starting`
- `streaming`
- `cancelling`
- `cancelled`
- `completed`
- `timed_out`
- `failed`

### StreamEvent

Fields:
- `generationId`
- `eventType`
- `delta`
- `elapsedMs`
- `modelId`
- `route`
- `sequence`

### StreamEventType

Values:
- `started`
- `delta`
- `completed`
- `cancelled`
- `timeout`
- `error`

### CancelGenerationRequest

Fields:
- `generationId`

### CancelGenerationResponse

Fields:
- `generationId`
- `state`
- `cancelled`
- `message`

### StreamingPromptRequest

Fields:
- `prompt`
- `mode`
- `modelId`
- `maxTokens`
- `temperature`
- `privacyMode`
- `stream`

Rules:
- prompt text remains local
- prompt content is not logged by default
- frontend does not provide sidecar arguments
- streaming prompt requests still use structured Rust-owned sidecar args

### StreamingPromptResult

Fields:
- `generationId`
- `finalText`
- `finishReason`
- `elapsedMs`
- `route`
- `modelId`
- `cancelled`
- `timedOut`
- `error`

### Streaming UI Contract

Chat workspace:
- Send is disabled while generation is `starting` or `streaming`.
- Cancel appears while generation is `starting` or `streaming`.
- Partial output appears in the active assistant message in event sequence order.
- Cancelled messages are visibly labeled `Cancelled`.
- Timed-out messages are visibly labeled `Timed out`.
- Failed messages show an actionable error.
- Route metadata remains visible: `local_sidecar`, model id/name, and elapsed time.

Runtime panel:
- shows `GenerationState`
- shows active model
- shows active route
- shows elapsed time while streaming
- shows last finish reason
- does not claim final UX polish

### Required CYRO-0011B Tests

CYRO-0011B implementation must include tests for:
- Rust state transitions `idle` -> `starting` -> `streaming` -> `completed`
- Rust cancel transition `streaming` -> `cancelling` -> `cancelled`
- timeout kills or reaps the child and returns `timed_out`
- only one active generation is allowed
- structured args are used and no shell command string is used
- stderr/debug detail is bounded and prompt-redacted
- Send is disabled while streaming
- Cancel is visible while streaming
- partial output is appended in order
- cancelled message is labeled
- timeout and error states are actionable

## CYRO-0011B Streaming stdout Implementation

CYRO-0011B implements the CYRO-0011A process lifecycle contract for the local `llama-cli` route. It does not add model files, sidecar binaries, downloads, `llama-server`, Rust FFI, Python, cloud APIs, provider APIs, PGLite persistence, sync, mobile, VPN, AgentScope, or queueing.

Commands:
- `send_local_prompt_streaming`
- `cancel_generation`

Tauri event:
- `cyro://local-prompt-stream`

Implemented stream event names:
- `started`
- `delta`
- `completed`
- `cancelled`
- `timeout`
- `error`

Streaming behavior:
- Rust validates the configured `llama-cli` path and `.gguf` model path before starting a stream.
- Rust spawns `llama-cli` with structured `Command` args only.
- Rust reads stdout incrementally and emits ordered `delta` events.
- React subscribes to stream events and appends deltas to the active assistant message.
- The final result replaces the partial message with cleaned stdout.
- Non-streaming `send_local_prompt` remains available as a fallback path.
- `local_mock` fallback remains available when no sidecar and no model path are configured.

Cancel behavior:
- only one active local generation is allowed
- a second streaming generation returns a recoverable `generation_busy` error
- `cancel_generation` targets the active Rust-owned child process
- cancel requests move the active generation to `cancelling`
- the child process is killed through Rust process control
- final stream state is emitted as `cancelled`
- partial output may remain visible and is labeled `Cancelled`
- active generation state is cleared before another local generation can begin

Timeout and failure behavior:
- streaming uses the same conservative timeout window as the non-streaming prompt path
- timeout kills or reaps the child process and emits `timeout`
- nonzero exit and empty response emit `error`
- stderr/debug detail is bounded and prompt-redacted before it reaches UI state
- prompt content is not logged by default
- streamed or partial output is not written to memory automatically

## LocalModelConfig

Fields:
- `modelId`
- `displayName`
- `family`
- `parameterClass`
- `quantization`
- `filePath`
- `fileName`
- `contextWindow`
- `installed`
- `validated`
- `fileSizeMb`
- `sha256Optional`
- `minRamMb`
- `recommendedRamMb`

## LocalPromptRequest

Fields:
- `prompt`
- `mode`
- `modelId`
- `contextWindow`
- `maxTokens`
- `temperature`
- `privacyMode`

Rules:
- prompt stays local
- prompt is not logged by default
- prompt is never sent to a cloud fallback
- prompt cannot alter shell command structure
- privacy mode can force Local Only behavior

## LocalPromptResponse

Fields:
- `response`
- `modelId`
- `mode`
- `route`
- `tokensPerSecondOptional`
- `elapsedMs`
- `finishReason`
- `mocked`

Rules:
- `mocked` must be false for real sidecar responses
- `route` must identify `local_sidecar` or `local_mock`
- `finishReason` must distinguish stop, length, canceled, and error where available

## RuntimeError

Fields:
- `code`
- `message`
- `recoverable`
- `userAction`
- `debugDetailSafe`

Error handling rules:
- missing model path returns user-actionable recovery
- invalid model path returns user-actionable recovery
- sidecar startup failure returns safe debug detail
- sidecar crash moves runtime to `error`
- generation cancellation returns canceled finish reason
- prompt content is excluded from error logs by default
- debug detail must not include secrets or full prompts

## Benchmark Requirements

Runtime benchmark is required before selecting benchmark-gated model/quantization pairs. CYRO-0009 provides the first in-memory local benchmark result; persistent Benchmark Store and full Runtime Governor consumption remain future work.

Benchmark records must stay local and include:
- model id
- model file name and size where available
- quantization
- context window class
- route
- mode
- elapsed milliseconds
- cold start class
- tokens per second class
- latency class
- memory pressure result
- thermal result
- battery impact class
- pass/fail gate
- timestamp

Benchmark must never upload telemetry.

## Streaming and Cancellation

Initial sidecar implementation may return full responses through `send_local_prompt`. CYRO-0011B adds optional `llama-cli` stdout streaming through `send_local_prompt_streaming` and keeps the non-streaming path available as fallback.

`llama-server` remains later work.

## Security Requirements

- No prompt sent to network.
- No model files committed.
- No model downloads in Phase 1 sidecar contract.
- No cloud fallback.
- No provider APIs.
- No Python runtime.
- No React direct access to model runtime.
- Rust owns runtime authority.
- Sidecar process must be supervised by Rust.
- All filesystem paths validated by Rust.
- No shell command injection through model path or prompt.
- Sidecar logs must not include prompt content by default.
- No telemetry.

## Current UX Boundary

The current Sprint 0 desktop UI is a demo baseline. It is not the final Local Brain UX.

CYRO-0004 defines runtime contracts only. Any UX redesign, model picker, runtime status panel changes, or loading controls require separate implementation tasks.

## Next Implementation Tasks

Recommended sequence:
1. Sidecar binary discovery/build plan.
2. Model path validation.
3. First local inference command.
4. Runtime status/error UX and manual path setup flow.
5. Runtime benchmark gate.
6. Local model candidate evaluation.
7. Streaming and cancellation contract.
8. Streaming stdout implementation.
9. Crisp answer protocol.
10. Context Capsule Builder ADR.
