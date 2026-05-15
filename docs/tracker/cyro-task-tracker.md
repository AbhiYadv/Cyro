# Cyro Task Tracker

| Task ID | Title | Branch | Status | Score | Review Date | Notes |
|---|---|---|---|---:|---|---|
| CYRO-0001 | Establish governance, architecture setup, and Git workflow | task/CYRO-0001-setup | Ready |  |  | Setup-only |
| CYRO-0002 | Sprint 0 Tauri desktop frontend shell | task/CYRO-0002-sprint0-tauri-shell | Ready for Final Review |  |  | Scope unchanged; mocked local runtime only; synced with current dev |
| CYRO-DOCS-0003 | Provider Account Bridge requirements | task/CYRO-DOCS-0003-provider-account-bridge | Merged to dev | 10/10 | 2026-05-15 | Docs/tracker only |
| CYRO-PROVIDER-001 | Embedded Provider Session ADR and Chat-First UX Contract | task/CYRO-PROVIDER-001-embedded-session-adr | Ready for Review |  | 2026-05-15 | ADR/security/session-container docs only; separates current external fallback from future embedded session |
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
