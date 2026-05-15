# Runtime Intelligence Layer

## Purpose

The Runtime Intelligence Layer decides how Cyro should answer a prompt locally, defer work, or route work to a trusted future laptop node. It is the policy layer for model size, quantization, runtime mode, and offload decisions.

This document is architecture and contracts only. It does not authorize llama.cpp implementation, PGLite, sync, mDNS, VPN, provider APIs, or product code changes.

## Decision

Cyro must not hardcode Fast, Think, or Pro to fixed model names. These are routing modes. The Runtime Governor maps each requested mode to the safest available route using device capability, installed models, benchmark data, thermal/battery state, user settings, and trusted node availability.

Local 0.8B remains the always-available fallback. Cyro must not assume every device can run 3B or larger models.

## Runtime Intelligence Layer

The Runtime Intelligence Layer has these responsibilities:
- collect or read device capability before selecting model size
- maintain installed model metadata
- gate quantization choices by benchmark data
- choose a route for Fast, Think, and Pro
- explain why a route was selected
- reject unsafe local runs under low memory, high thermal pressure, or low battery
- require explicit approval before future offload
- preserve Local Only availability for private or sensitive prompts

The layer is deterministic. It is not an agent.

## Local Brain Sidecar Route

The first real Local Brain implementation route is `local_sidecar`, backed by a supervised `llama.cpp sidecar` process owned by Rust/Tauri.

Runtime Governor must consider sidecar status before selecting `local_sidecar`:
- model path configured
- model path validated
- model registry entry installed
- benchmark gate satisfied when required
- sidecar process available
- runtime state ready or loadable
- thermal and battery gates passing

If the sidecar is not configured, invalid, unavailable, loading, generating, errored, or benchmark-blocked, Runtime Governor must return an explainable fallback such as `local_mock`, a lighter local configuration, defer, or user action required.

Fast, Think, and Pro continue to map to route decisions. They do not map directly to hardcoded model names.

## Hardware Profiler

Hardware Profiler records the local device capability snapshot used by runtime decisions.

It must capture:
- RAM and available RAM
- OS and CPU architecture
- GPU/NPU availability
- battery and charging state
- thermal state
- timestamp

The profiler must avoid expensive polling on the phone. Runtime decisions can use the last known safe profile if it is fresh enough; stale profiles must force conservative fallback.

## Model Registry

Model Registry stores known and installed models. It does not load models by itself.

The registry must record:
- model family and parameter class
- quantization
- file size
- context window
- target device class
- minimum and recommended RAM
- whether benchmark evidence is required
- last benchmark id

The registry must allow Cyro to distinguish "available in catalog" from "installed locally" and "safe on this device."

## Quantization Policy

Quantization is a runtime safety choice, not a marketing label.

Policy:
- Qwen 0.8B Q4 is the default local quick draft target.
- Qwen 0.8B Q3 is the battery or memory fallback.
- 2-bit is allowed only for router, redaction, emergency fallback, or narrow utility tasks; it is never the main answer model.
- 1.5B, 3B, and larger models require a resource policy, installed model record, and passing benchmark gate.
- A model/quantization pair must not be selected if benchmark data is missing and `benchmarkRequired` is true.

The quantization policy must account for:
- total RAM
- available RAM
- expected context window
- battery state
- thermal state
- benchmark latency
- user settings
- offload availability

## Runtime Governor

Runtime Governor turns a requested user mode into a `RuntimeRouteDecision`.

Inputs:
- requested mode: Fast, Think, or Pro
- `HardwareProfile`
- installed model registry entries
- benchmark store data
- user runtime settings
- privacy and Local Only state
- future trusted `NodeAvailability`

Outputs:
- selected route
- selected model id
- selected quantization
- human-readable reason
- fallback reason when applicable
- whether user approval is required
- privacy impact
- estimated latency class

Runtime Governor must always make an explainable decision. The UI must be able to show why Cyro selected Local 0.8B, downgraded quantization, deferred work, or required approval for offload.

## Benchmark Store

Benchmark Store persists device/model benchmark evidence. It must not be a full telemetry system.

It records local benchmark results needed for safe runtime decisions:
- benchmark id
- device id
- model id
- quantization
- context window class
- tokens per second class
- cold start latency class
- memory pressure result
- thermal result
- battery impact class
- passed or failed gate
- created timestamp

Benchmarks are local-first. Cloud telemetry or background upload is out of scope.

## Laptop Node Discovery Contract

Laptop node discovery is future work. This task does not implement same-Wi-Fi discovery, mDNS, pairing, sync, or offload.

Future discovery must require:
- explicit trusted device pairing
- user-visible node name
- same-Wi-Fi or explicit local route status
- available model list
- estimated latency
- last seen timestamp
- ability to revoke trust

Discovery must not silently offload prompts. Finding a node is not approval to use it.

## Offload Routing Policy

Offload is a future trusted route for heavier local work. It is not a cloud provider path.

Rules:
- no silent offload of prompts
- no offload without trusted pairing
- no offload without visible route explanation
- no offload for sensitive prompts unless user approves the privacy impact
- Local Only must bypass offload
- laptop node route must be unavailable by default until pairing exists
- node route failure must fall back locally or ask the user, not retry hidden work

Offload decisions must use the same `RuntimeRouteDecision` contract as local decisions.

## Thermal/Battery Safety Policy

The runtime must protect phone responsiveness and battery.

Rules:
- do not keep multiple local models hot on phone
- do not start heavy local inference under high thermal pressure
- prefer Q3 or Local 0.8B fallback under battery pressure
- unload idle models
- avoid full memory scans on fast path
- avoid provider, VPN, desktop node, or network startup on Fast path
- defer heavy compile/index work to desktop

The Runtime Governor must downgrade or defer work when safety gates fail.

## Contracts

### HardwareProfile

Fields:
- `deviceId`
- `deviceType`
- `os`
- `totalRamMb`
- `availableRamMb`
- `cpuArch`
- `gpuAvailable`
- `npuAvailable`
- `batteryPercent`
- `charging`
- `thermalState`
- `lastUpdatedAt`

### ModelRegistryEntry

Fields:
- `modelId`
- `family`
- `parameterClass`
- `quantization`
- `fileSizeMb`
- `contextWindow`
- `installed`
- `deviceTarget`
- `minRamMb`
- `recommendedRamMb`
- `benchmarkRequired`
- `lastBenchmarkId`

### RuntimeRouteDecision

Fields:
- `requestedMode`
- `selectedRoute`
- `selectedModelId`
- `selectedQuantization`
- `reason`
- `fallbackReason`
- `requiresUserApproval`
- `privacyImpact`
- `estimatedLatencyClass`

### NodeAvailability

Fields:
- `nodeId`
- `nodeName`
- `sameWifi`
- `trusted`
- `availableModels`
- `estimatedLatencyMs`
- `lastSeenAt`

## Route Modes

Fast:
- optimize for immediate local response
- must not require provider tab, VPN, laptop node, full memory scan, or large model load
- defaults to Local 0.8B safe path through `local_sidecar` once configured, otherwise demo `local_mock`

Think:
- can use more context and slower local processing
- may select larger local model only when installed, benchmarked, and resource-safe
- may propose future offload only after pairing and explicit approval

Pro:
- visible as a future mode
- may require larger local model or trusted laptop route later
- must not silently offload
- must explain privacy and latency impact before use

## Required Future Tests

Runtime implementation must include tests for:
- Fast path chooses Local 0.8B fallback when capability is unknown
- 3B is blocked when RAM or benchmark gate fails
- Q3 fallback is selected under battery pressure
- high thermal state prevents heavy local model selection
- offload requires trusted pairing and user approval
- Local Only prevents offload
- route decision includes human-readable reason
- missing benchmark blocks benchmark-required model

## Out Of Scope

This document does not implement:
- llama.cpp
- PGLite
- sync
- mDNS or same-Wi-Fi discovery
- VPN
- provider APIs
- provider sessions
- model downloads
- benchmark execution
- laptop node transport
