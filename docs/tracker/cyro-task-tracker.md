# Cyro Task Tracker

| Task ID | Title | Branch | Status | Score | Review Date | Notes |
|---|---|---|---|---:|---|---|
| CYRO-0001 | Establish governance, architecture setup, and Git workflow | task/CYRO-0001-setup | Ready |  |  | Setup-only |
| CYRO-0002 | Sprint 0 Tauri desktop frontend shell | task/CYRO-0002-sprint0-tauri-shell | Ready for Final Review |  |  | Scope unchanged; mocked local runtime only; synced with current dev |
| CYRO-DOCS-0003 | Provider Account Bridge requirements | task/CYRO-DOCS-0003-provider-account-bridge | Merged to dev | 10/10 | 2026-05-15 | Docs/tracker only |
| CYRO-PROVIDER-001 | Embedded Provider Session ADR and Chat-First UX Contract | task/CYRO-PROVIDER-001-embedded-session-adr | Ready for Review |  | 2026-05-15 | ADR/security/session-container docs only; separates current external fallback from future embedded session |
| CYRO-0003 | Runtime Intelligence Layer for Local Brain Phase | task/CYRO-0003-runtime-intelligence-layer | Ready for Review |  | 2026-05-15 | Architecture/contracts only; no llama.cpp, PGLite, sync, mDNS, VPN, provider APIs, or product code |
| CYRO-0004 | llama.cpp Sidecar ADR and Local Brain Runtime Contract | task/CYRO-0004-llama-sidecar-adr | Merged to dev | 10/10 | 2026-05-15 | Architecture/contracts only; no binaries, model files, downloads, FFI, Python, cloud fallback, or product code |
| CYRO-0005 | Sidecar Binary Discovery and Build Plan | task/CYRO-0005-sidecar-discovery-strategy | Ready for Review |  | 2026-05-15 | Defines discovery/status strategy and mocked `get_sidecar_status`; no binary execution or inference |
| CYRO-0006 | Model Path Validation and Registry Placeholder | Phase 1 | Planned |  |  | Rust validates user-provided GGUF path, metadata, size, and safe error behavior |
| CYRO-0007 | First Local Inference Command | Phase 1 | Planned |  |  | Implements first `send_local_prompt` sidecar command after sidecar and model validation |
| CYRO-0008 | Streaming and Cancel Contract | Phase 1B | Planned |  |  | Defines token streaming, cancellation, partial output, and process kill strategy |
| CYRO-0009 | Runtime Benchmark Gate | Phase 1 | Planned |  |  | Records local benchmark evidence before selecting benchmark-gated models |
| CYRO-PROVIDER-002 | Isolated Provider Session Container Design | Backlog | Planned |  |  | Documents isolated webview/session boundaries without storing provider credentials |
| CYRO-PROVIDER-003 | Unified Composer Provider Selector UX | Backlog | Planned |  |  | Designs Local/ChatGPT/Claude/Gemini route selector inside one chat UX |
| CYRO-PROVIDER-004 | Prompt Privacy Scanner | Backlog | Planned |  |  | Defines local scan for secrets/PII/internal data before provider send |
| CYRO-PROVIDER-005 | User-Approved Provider Response Import | Backlog | Planned |  |  | Provider responses enter Cyro history/memory only by explicit user approval |
| CYRO-PROVIDER-006 | Provider-Derived Ghost Tree Memory Proposal | Backlog | Planned |  |  | Cyro proposes structured memory facts from provider responses for user approval |
| CYRO-PROVIDER-007 | Provider Session Health Panel | Backlog | Planned |  |  | Shows logged-in/available/blocked/error state per provider |
| CYRO-PROVIDER-008 | Embedded Provider Session Feasibility Spike | Backlog | Planned |  |  | Proves whether Tauri can host visible provider sessions without exposing cookies, DOM, or response content |
| CYRO-PROVIDER-009 | Provider Terms and Compliance Review | Backlog | Planned |  |  | Reviews ChatGPT/Claude/Gemini embedded-session constraints and defines allowed fallback behavior |
| CYRO-PROVIDER-010 | Provider Session Container Isolation Tests | Backlog | Planned |  |  | Verifies provider id allowlist, arbitrary URL rejection, no cookie exposure, no DOM scraping, and visible blocker handling |
| CYRO-PROVIDER-011 | Chat-First Embedded Provider Surface Prototype | Backlog | Planned |  |  | Tests an embedded provider surface while keeping provider selection in the composer and avoiding right-panel provider cards |
| CYRO-RUNTIME-001 | Hardware Profiler Contract | Phase 1 | Planned |  |  | Defines device capability snapshot before model selection |
| CYRO-RUNTIME-002 | Model Registry Contract | Phase 1 | Planned |  |  | Tracks installed models, quantization, RAM gates, and benchmark requirement |
| CYRO-RUNTIME-003 | Quantization Policy Matrix | Phase 1 | Planned |  |  | Gates Q4/Q3/2-bit/larger model choices by resources and benchmark evidence |
| CYRO-RUNTIME-004 | Runtime Governor Route Decision Contract | Phase 1 | Planned |  |  | Defines explainable Fast/Think/Pro route decisions and fallback reasons |
| CYRO-RUNTIME-005 | Benchmark Store and Device Capability Gates | Phase 1 | Planned |  |  | Stores local benchmark evidence for safe runtime selection |
| CYRO-RUNTIME-006 | Same-Wi-Fi Laptop Node Discovery ADR | Phase 2/3 | Backlog |  |  | Future ADR for discovery only; no mDNS implementation in CYRO-0003 |
| CYRO-RUNTIME-007 | Trusted Offload Routing Policy | Phase 2/3 | Backlog |  |  | Future trusted laptop route with pairing, approval, and no silent offload |
