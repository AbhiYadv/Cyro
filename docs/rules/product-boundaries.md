# Product Boundaries

Cyro is a mobile-first sovereign AI memory workspace.

Cyro is not:
- ChatGPT wrapper
- browser automation tool
- VPN-first product
- local GPT clone
- scraping product
- agent toy

Core value:
- user-owned memory
- Context Capsules
- Mobile Snapshot
- Import-to-Memory
- desktop memory compiler
- Runtime Intelligence Layer for local brain routing
- Provider Account Bridge as a future unified AI workspace for local AI plus user-owned provider accounts

Provider Account Bridge is not:
- an API-key wrapper
- hidden scraping
- auto-login
- cookie export
- provider bypass
- stealth automation

Sprint 0 remains the mocked Tauri desktop shell. Provider Account Bridge implementation stays backlog/future until explicitly authorized.

Runtime Intelligence boundaries:
- Fast, Think, and Pro are routing modes, not fixed model names.
- Local 0.8B remains the fallback.
- 3B and larger models require hardware, benchmark, battery, and thermal gates.
- Laptop offload requires future trusted pairing and explicit approval.
- No prompt may be silently offloaded.
- Same-Wi-Fi discovery, mDNS, sync, VPN, PGLite, and llama.cpp implementation require separate future tasks.

Local Brain sidecar boundaries:
- No model files committed.
- No sidecar binaries committed unless a future packaging task explicitly approves bundled binary handling.
- No model downloads without a separate approved task.
- No sidecar auto-download in CYRO-0005.
- No cloud fallback for Local Brain.
- No React direct access to model runtime.
- No React binary discovery, probing, or execution authority.
- Rust owns runtime authority.
- Sidecar process must be supervised by Rust.
- All model paths must be validated by Rust.
- Sidecar binary paths must be validated by Rust.
- Sidecar logs must not include prompt content by default.
