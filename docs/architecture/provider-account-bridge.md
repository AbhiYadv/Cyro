# Provider Account Bridge Architecture

## Purpose

Provider Account Bridge is a future architecture for one Cyro chat-first workspace that can route a prompt to the local runtime or to a user-owned provider account session. It is not part of Sprint 0 implementation.

Cyro must not behave like separate browser tabs for ChatGPT, Claude, Gemini, and future providers. The product goal is one unified composer where Cyro owns the Ghost Tree memory, vault, privacy filter, runtime routing, and Cyro-owned sync layer.

## Control Plane

Cyro local layers remain the control plane:
- Ghost Tree memory
- Vault
- Prompt Privacy Filter
- Runtime Governor
- Context Capsule Builder
- Import-to-Memory flow
- Cyro-owned sync of memory/config/history

Provider sessions are execution targets only. They do not own Cyro memory, vault, privacy policy, or memory write authority.

## Required Flow

1. User enters prompt in the Cyro composer.
2. User selects route: Local, ChatGPT, Claude, Gemini, or Auto later.
3. Cyro Prompt Privacy Filter scans the prompt locally.
4. If sensitive data is detected, user chooses redact, send as-is, or Local Only.
5. For Local route, the prompt goes to Cyro local or laptop model runtime.
6. For Provider route, the prompt is passed only through a user-visible, user-authenticated provider session.
7. Provider response returns into the Cyro conversation view.
8. Cyro proposes optional Ghost Tree memory facts from the response.
9. User approves or rejects memory writes into Ghost Tree.
10. Cyro syncs only Cyro-owned memory, config, and history according to the user's sync settings.

## Required Contracts

- `ProviderRoute`: `local`, `chatgpt`, `claude`, `gemini`, `future_provider`, and later `auto`.
- `ProviderSessionStatus`: provider id, availability, logged-in state, user-action-required state, blocked/error state, and last checked timestamp.
- `PromptPrivacyScan`: sensitivity label, detected categories, suggested redactions, and required user decision.
- `ProviderResponseImport`: provider id, user-approved import status, source timestamp, summary candidate, and raw-response storage policy.
- `GhostTreeMemoryProposal`: source, confidence, sensitivity, status, timestamp, evidence link, and approve/reject decision.

## Future ADRs Required

- Provider Session Container ADR.
- Provider Terms and Security ADR.

These ADRs must be completed before provider session implementation begins.

## Security Boundaries

- Frontend displays provider/session state but does not own secrets or privileged authority.
- Rust/Tauri owns privileged system/session boundaries.
- Provider login remains user-controlled.
- Cyro stores no provider passwords.
- Cyro does not steal, export, copy, or manipulate provider cookies.
- Cyro does not bypass CAPTCHA, rate limits, login protections, or provider terms.
- No hidden provider automation is allowed.
- User-visible consent is required before sending a prompt to a provider.
- User approval is required before importing provider output into Ghost Tree memory.

## Explicit Non-Implementation

This document does not authorize provider webviews, browser automation, scraping, OAuth, provider APIs, sync, PGLite, local model inference, mobile implementation, VPN, llama.cpp, or AgentScope work.
