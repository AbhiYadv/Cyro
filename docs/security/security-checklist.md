# Cyro Security Checklist

## Provider Boundary
- [ ] No cookie capture
- [ ] No cookie export
- [ ] No cookie manipulation
- [ ] No session mirroring
- [ ] No DOM scraping
- [ ] No output mirroring
- [ ] No auto-send
- [ ] No auto-login
- [ ] No CAPTCHA bypass
- [ ] No rate-limit bypass
- [ ] No provider terms bypass
- [ ] No stealth automation
- [ ] No provider APIs for Provider Account Bridge unless a future task explicitly authorizes API mode
- [ ] Provider responses imported only by explicit user approval or a separately approved official API mode

## Provider Session Security
- [ ] Provider sessions are isolated and user-visible
- [ ] Provider login is manually controlled by the user
- [ ] Cyro stores no provider passwords
- [ ] React state contains no provider passwords, cookies, tokens, or privileged provider session data
- [ ] Rust/Tauri owns privileged provider/session boundaries
- [ ] Prompt Privacy Filter runs before external provider send
- [ ] Sensitive prompt warning offers redact, send as-is, or Local Only
- [ ] User consent is required before provider send

## Memory Boundary
- [ ] No silent memory updates
- [ ] Provider imports create candidates only
- [ ] Provider-derived Ghost Tree memory proposals require user approval
- [ ] Memory approval UI exists
- [ ] Context Capsule uses approved memory only
- [ ] Raw vault excluded by default

## Local Storage
- [ ] Encrypted history planned
- [ ] Blob storage lazy-loaded
- [ ] Checksums on snapshots
- [ ] Event log append-only

## Runtime
- [ ] Phone does not keep multiple models hot
- [ ] Heavy compile deferred to desktop
- [ ] Fast path does not require VPN/provider/desktop
- [ ] Runtime route decision uses hardware profile, model registry, benchmark gates, battery, and thermal state
- [ ] 3B or larger models are blocked unless resource and benchmark gates pass
- [ ] Quantization choice is benchmark-gated when required
- [ ] Local 0.8B fallback remains available
- [ ] Laptop/node offload requires trusted pairing and explicit user approval
- [ ] No prompt is silently offloaded
- [ ] User can see why a runtime route was selected

## Sidecar Binary
- [ ] Rust/Tauri owns sidecar discovery and validation
- [ ] Frontend does not discover, probe, or execute binaries
- [ ] Sidecar binary name is allowlisted
- [ ] Arbitrary shell command strings are rejected
- [ ] Candidate paths are validated by Rust before use
- [ ] Discovery does not log prompt content
- [ ] No sidecar or model binaries are committed
- [ ] No auto-download is added without an explicit packaging task

## Sidecar Prompt Execution
- [ ] Rust launches `llama-cli` with structured `Command` args only
- [ ] No shell command string, `shell=true`, or command concatenation is used
- [ ] Frontend does not pass arbitrary sidecar args
- [ ] `llama-cli` runs with fixed internal non-interactive/offline flags, not user-provided args
- [ ] Prompt content is not logged by default
- [ ] Sidecar prompt execution has a timeout
- [ ] Timeout kills or reaps the child process
- [ ] Nonzero exit returns an actionable runtime error
- [ ] Stderr/debug output is bounded and prompt-redacted before surfacing
- [ ] Streaming and cancellation UX remain future work

## Model Path Validation
- [ ] Rust/Tauri validates all model filesystem paths
- [ ] Frontend does not validate filesystem paths directly
- [ ] URL-like model paths such as `http://`, `https://`, and `file://` are rejected
- [ ] Command-like strings and shell arguments are rejected before filesystem lookup
- [ ] Candidate path must exist, be a file, be readable, and use `.gguf`
- [ ] Validation records file metadata only; it does not parse, hash, load, or execute the model
- [ ] Model files remain ignored by Git, including `*.gguf`, `*.bin`, and `*.safetensors`
- [ ] No model download, cloud fallback, or inference is added by validation tasks

## Git/Release
- [ ] Task branch from dev
- [ ] Tests/checks run
- [ ] Review score 10/10 before merge
