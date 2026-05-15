# MVP Roadmap

## Phase 0 — Governance + Sprint 0 Shell

- AGENTS.md
- architecture docs
- rules
- tracker
- score gates
- mocked Tauri desktop shell

## Phase 1 — Local Brain Runtime Foundation

- Runtime Intelligence Layer contracts
- Hardware Profiler contract
- Model Registry contract
- Quantization Policy matrix
- Runtime Governor route decision contract
- Benchmark Store gates
- thermal and battery safety policy
- route explanation contract
- no llama.cpp implementation yet

## Phase 2 — Local 0.8B Brain

- Local 0.8B quick draft integration
- Q4 default and Q3 fallback policy
- model loading lifecycle
- mocked-to-real runtime bridge
- resource governor enforcement
- no larger models until benchmark gates pass

## Phase 3 — Ghost Tree Memory

- memory contracts
- context capsule service
- memory compiler service
- import service
- temporal/stale memory service
- entity and relationship graph
- Memory Inspector
- Import-to-Memory Sheet
- Mobile Snapshot Status

## Phase 4 — Vault + PageIndex

- local DB strategy
- encrypted history
- memory candidate storage
- vault indexing contract
- PageIndex/EvidenceTree design
- raw vault exclusion by default
- Context Capsule evidence selection

## Phase 5 — Phone + Laptop Offload

- Cyro mobile shell
- native composer
- Context Capsule Preview
- Mobile Snapshot
- desktop memory compiler
- Tauri desktop node
- trusted laptop pairing design
- same-Wi-Fi discovery ADR
- offload routing policy
- no silent prompt offload

## Phase 6 — Provider Account Bridge

- Provider Account Bridge ADR
- isolated provider session container design
- unified composer provider selector UX
- prompt privacy scanner
- user-approved provider response import
- provider-derived Ghost Tree memory proposal
- provider session health panel
- provider implementation remains blocked until explicit task approval

## Deferred — VPN, VSN, AgentScope, Embedded Provider Sessions, Cloud APIs, Offline STT/TTS

- VPN
- VSN
- AgentScope
- embedded provider sessions
- cloud APIs
- MCP production tools
- offline STT/TTS
- large local models beyond approved resource gates
- autonomous agents

## Backlog — Provider Account Bridge

- Provider Account Bridge ADR
- Isolated Provider Session Container Design
- Unified Composer Provider Selector UX
- Prompt Privacy Scanner
- User-Approved Provider Response Import
- Provider-Derived Ghost Tree Memory Proposal
- Provider Session Health Panel

All Provider Account Bridge implementation tasks are future/backlog work and do not change Sprint 0.

## Backlog — Runtime Intelligence

- Hardware Profiler Contract
- Model Registry Contract
- Quantization Policy Matrix
- Runtime Governor Route Decision Contract
- Benchmark Store and Device Capability Gates
- Same-Wi-Fi Laptop Node Discovery ADR
- Trusted Offload Routing Policy

Runtime Intelligence implementation must stay resource-aware and user-visible. Laptop offload remains future work until trusted pairing and explicit approval are designed.
