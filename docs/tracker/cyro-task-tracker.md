# Cyro Task Tracker

| Task ID | Title | Branch | Status | Score | Review Date | Notes |
|---|---|---|---|---:|---|---|
| CYRO-0001 | Establish governance, architecture setup, and Git workflow | task/CYRO-0001-setup | Ready |  |  | Setup-only |
| CYRO-0002 | Sprint 0 Tauri desktop frontend shell | task/CYRO-0002-sprint0-tauri-shell | Ready for Final Review |  |  | Scope unchanged; mocked local runtime only; synced with current dev |
| CYRO-DOCS-0003 | Provider Account Bridge requirements | task/CYRO-DOCS-0003-provider-account-bridge | Merged to dev | 10/10 | 2026-05-15 | Docs/tracker only |
| CYRO-PROVIDER-001 | Embedded Provider Session ADR and Chat-First UX Contract | task/CYRO-PROVIDER-001-embedded-session-adr | Ready for Review |  | 2026-05-15 | ADR/security/session-container docs only; separates current external fallback from future embedded session |
| CYRO-0003 | Runtime Intelligence Layer for Local Brain Phase | task/CYRO-0003-runtime-intelligence-layer | Ready for Review |  | 2026-05-15 | Architecture/contracts only; no llama.cpp, PGLite, sync, mDNS, VPN, provider APIs, or product code |
| CYRO-0004 | llama.cpp Sidecar ADR and Local Brain Runtime Contract | task/CYRO-0004-llama-sidecar-adr | Merged to dev | 10/10 | 2026-05-15 | Architecture/contracts only; no binaries, model files, downloads, FFI, Python, cloud fallback, or product code |
| CYRO-0005 | Sidecar Binary Discovery and Build Plan | task/CYRO-0005-sidecar-discovery-strategy | Merged to dev | 10/10 | 2026-05-15 | Defines discovery/status strategy and mocked `get_sidecar_status`; no binary execution or inference |
| CYRO-0006 | Model Path Validation and Registry Placeholder | task/CYRO-0006-model-path-validation | Merged to dev | 10/10 | 2026-05-15 | Rust validates local `.gguf` path, exposes placeholder registry, and adds no model loading, inference, downloads, or binaries |
| CYRO-DOCS-0007 | Hermes + OpenHuman Ghost Tree Memory Direction | task/CYRO-DOCS-0007-memory-tracker | Merged to dev | 10/10 | 2026-05-15 | Docs/tracker only; locks Ghost Tree memory direction after Local Brain proof |
| CYRO-DOCS-0008 | Provider Account Bridge final UX correction | task/CYRO-DOCS-0008-provider-ux-correction | Merged to dev | 10/10 | 2026-05-15 | Docs/tracker only; locks final provider UX as embedded inside Cyro with external browser fallback temporary only |
| CYRO-0007 | First Local GGUF Prompt via Rust-Supervised Sidecar | task/CYRO-0007-first-local-gguf-prompt | Merged to dev | 10/10 | 2026-05-15 | Adds optional non-streaming `llama-cli` prompt path when sidecar/model paths are validated; mock fallback remains for not configured |
| CYRO-0008 | Runtime Status/Error UX and Manual Sidecar Path Flow | task/CYRO-0008-runtime-status-path-flow | Merged to dev | 10/10 | 2026-05-15 | Adds manual sidecar/model path validation UI, combined runtime status, and visible `local_mock` vs `local_sidecar` route metadata; no streaming or downloads |
| CYRO-0009 | Runtime Benchmark Gate for Local GGUF Sidecar | task/CYRO-0009-runtime-benchmark-gate | Ready for Review |  | 2026-05-15 | Adds explicit local-only benchmark button/result for validated `llama-cli` and `.gguf` paths; no startup benchmark, telemetry, downloads, streaming, or model files |
| CYRO-0010 | Local Model Candidate Evaluation | Phase 1 | Planned |  |  | Uses benchmark evidence to evaluate 0.8B, 1.5B, and 3B candidates without committing model files or binaries |
| CYRO-0011 | Streaming + Cancel | Phase 1B | Planned |  |  | Defines token streaming, cancellation, partial output, process kill strategy, and richer process lifecycle UX |
| CYRO-0012 | Crisp Answer Protocol | Phase 1B | Planned |  |  | Defines prompt/runtime answer protocol for concise local answers after runtime proof and benchmark gating |
| CYRO-PROVIDER-002 | Isolated Provider Session Container Design | Backlog | Planned |  |  | Documents isolated webview/session boundaries without storing provider credentials |
| CYRO-PROVIDER-003 | Unified Composer Provider Selector UX | Backlog | Planned |  |  | Designs Local/ChatGPT/Claude/Gemini route selector inside one chat UX |
| CYRO-PROVIDER-004 | Prompt Privacy Scanner | Backlog | Planned |  |  | Defines local scan for secrets/PII/internal data before provider send |
| CYRO-PROVIDER-005 | User-Approved Provider Response Import | Backlog | Planned |  |  | Provider responses enter Cyro history/memory only by explicit user approval |
| CYRO-PROVIDER-006 | Provider-Derived Ghost Tree Memory Proposal | Backlog | Planned |  |  | Cyro proposes structured memory facts from provider responses for user approval |
| CYRO-PROVIDER-007 | Provider Session Health Panel | Backlog | Planned |  |  | Shows logged-in/available/blocked/error state per provider |
| CYRO-PROVIDER-008 | Embedded Provider Session Feasibility | Backlog | Planned |  |  | Proves whether Tauri can host visible provider sessions inside Cyro without exposing cookies, DOM, or response content |
| CYRO-PROVIDER-009 | In-Cyro Provider Surface Prototype | Backlog | Planned |  |  | Prototypes ChatGPT/Claude/Gemini opening inside Cyro's chat-first UX, not separate browser windows |
| CYRO-PROVIDER-010 | Provider Import Button | Backlog | Planned |  |  | Adds explicit user action to import visible provider answers into Cyro history or memory-candidate flow |
| CYRO-PROVIDER-011 | Always Import Visible Provider Answers Policy | Backlog | Planned |  |  | Defines that provider answers enter Cyro only through visible, user-triggered import; no hidden response capture |
| CYRO-PROVIDER-012 | Provider Terms and Compliance Review | Backlog | Planned |  |  | Reviews ChatGPT/Claude/Gemini embedded-session constraints and defines temporary external-browser fallback behavior |
| CYRO-PROVIDER-013 | Provider Session Container Isolation Tests | Backlog | Planned |  |  | Verifies provider id allowlist, arbitrary URL rejection, no cookie exposure, no DOM scraping, and visible blocker handling |
| CYRO-RUNTIME-001 | Hardware Profiler Contract | Phase 1 | Planned |  |  | Defines device capability snapshot before model selection |
| CYRO-RUNTIME-002 | Model Registry Contract | Phase 1 | Planned |  |  | Tracks installed models, quantization, RAM gates, and benchmark requirement |
| CYRO-RUNTIME-003 | Quantization Policy Matrix | Phase 1 | Planned |  |  | Gates Q4/Q3/2-bit/larger model choices by resources and benchmark evidence |
| CYRO-RUNTIME-004 | Runtime Governor Route Decision Contract | Phase 1 | Planned |  |  | Defines explainable Fast/Think/Pro route decisions and fallback reasons |
| CYRO-RUNTIME-005 | Benchmark Store and Device Capability Gates | Phase 1 | Planned |  |  | Stores local benchmark evidence for safe runtime selection |
| CYRO-RUNTIME-006 | Same-Wi-Fi Laptop Node Discovery ADR | Phase 2/3 | Backlog |  |  | Future ADR for discovery only; no mDNS implementation in CYRO-0003 |
| CYRO-RUNTIME-007 | Trusted Offload Routing Policy | Phase 2/3 | Backlog |  |  | Future trusted laptop route with pairing, approval, and no silent offload |
| CYRO-MEMORY-001 | Context Capsule Builder ADR | Phase 3 - Ghost Tree Memory | Planned |  |  | Defines how Cyro selects a small relevant memory slice for each prompt |
| CYRO-MEMORY-002 | Ghost Tree Memory Engine ADR | Phase 3 - Ghost Tree Memory | Planned |  |  | Defines Hermes + OpenHuman-style memory architecture |
| CYRO-MEMORY-003 | Memory Event and Chunk Contracts | Phase 3 - Ghost Tree Memory | Planned |  |  | Defines memory_events, memory_chunks, memory_candidates, ghost_tree_nodes, context_capsules, and audit log contracts |
| CYRO-MEMORY-004 | Hermes Personalization Contract | Phase 3 - Ghost Tree Memory | Planned |  |  | Defines user.md, memory.md, projects.md, skills/, preference facts, and approval flow |
| CYRO-MEMORY-005 | Fast Memory Injection and Hot Cache Design | Phase 3 - Ghost Tree Memory | Planned |  |  | Designs sub-second perceived memory retrieval using hot cache, Ghost Tree, keyword search, and optional derived vector cache |
| CYRO-MEMORY-006 | Memory Retention and Pruning Policy | Phase 3 - Ghost Tree Memory | Planned |  |  | Defines raw log retention, distilled fact retention, rejected candidate deletion, audit policy, and user controls |
| CYRO-MEMORY-007 | Phone/Laptop Memory Sync Policy | Phase 5 - Phone + Laptop Offload | Backlog |  |  | Defines hot memory on phone, deep archive on laptop, and sync boundaries |
| CYRO-AGENT-001 | Cyro Agent Harness ADR | Later | Backlog |  |  | Defines bounded planner, tool registry, permission gate, execution log, and skill recorder before any agent framework |
| CYRO-AGENT-002 | AgentScope Evaluation | Later | Backlog |  |  | Evaluates AgentScope only after local runtime, memory engine, and tool permission boundaries exist |

## Memory Direction

Cyro Ghost Tree is a Hermes-style personal memory system built on OpenHuman-style compressed memory-tree infrastructure.

Memory direction:
- Hermes defines what Cyro should remember: user preferences, style, active projects, decisions, recurring workflows, constraints, and reusable skills.
- OpenHuman-style infrastructure defines how Cyro stores, compresses, searches, and injects memory efficiently.
- Ghost Tree and Markdown/JSON records are source of truth; vector/search indexes are derived caches only.
- Cyro targets million-token-scale retained memory as compressed/indexed local storage, not as a single local model context window.
- 12M-token-scale retained memory is a storage/indexing target, not a promise that local models receive a 12M-token prompt.
- Context Capsule Builder injects only the relevant selected slice into the model.
- Context Capsule Builder is tracked before full Ghost Tree implementation.
- Memory implementation remains after Local Brain runtime proof.
- AgentScope is deferred until Cyro Agent Harness boundaries are defined.

## Provider Account Bridge Final UX Target

Final Provider Account Bridge UX target: ChatGPT, Claude, Gemini, and future providers open inside Cyro's chat-first UX, not as separate browser windows.

External browser fallback is temporary and only used when embedded provider session is unavailable, blocked, or not yet implemented.

Cyro remains the control plane for memory, vault, privacy filtering, provider route selection, and context capsule preparation.

Provider-owned content must remain visible and user-controlled inside an isolated Cyro provider surface.
