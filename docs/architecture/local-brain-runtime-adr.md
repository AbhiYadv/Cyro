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

## Model Path and Registry Behavior

Phase 1 starts with a user-provided GGUF model path. Cyro does not commit model files and does not download model files in this phase.

Model path rules:
- filesystem paths are validated by Rust
- arbitrary frontend URLs are rejected
- model file must exist
- extension and file metadata must match allowed GGUF expectations
- path must not be interpolated into a shell command
- invalid path returns a recoverable runtime error

Model registry behavior:
- `LocalModelConfig` records configured local models
- model files are outside Git
- registry stores metadata, validation status, and optional checksum only
- installed means "known and locally present", not "loaded"
- validated means Rust has checked file existence and metadata
- benchmark gates still apply before Runtime Governor selects the model

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
- `set_model_path`
- `load_local_model`
- `unload_local_model`
- `send_local_prompt`
- `cancel_generation`
- `run_runtime_benchmark`

Command authority:
- React invokes commands.
- Rust validates inputs and owns runtime authority.
- Sidecar receives only validated local runtime work from Rust.

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

Runtime benchmark is required before selecting benchmark-gated model/quantization pairs.

Benchmark records must stay local and include:
- model id
- quantization
- context window class
- cold start class
- tokens per second class
- memory pressure result
- thermal result
- battery impact class
- pass/fail gate
- timestamp

Benchmark must never upload telemetry.

## Streaming and Cancellation

Initial sidecar implementation may return full responses.

Streaming is Phase 1B if needed. Before streaming is implemented, Cyro must still define cancellation behavior:
- cancel request maps to supervised process interruption or request cancellation
- stuck generation must have a kill strategy
- cancel must return a recoverable runtime state
- partial output handling must be explicitly defined before streaming ships

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
4. Streaming and cancellation contract.
5. Runtime benchmark gate.
