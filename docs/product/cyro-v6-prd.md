# Cyro V6 PRD — Mobile-First Sovereign AI Memory Workspace

## Product Definition

Cyro is a mobile-first sovereign AI memory workspace. It builds a private structured memory from connected sources, imported provider answers, local notes, files, voice transcripts, and user activity. It converts that information into entities, relationships, temporal chains, compressed summaries, Mobile Snapshots, and Context Capsules.

Cyro’s main value is not a provider tab or a local chatbot alone. The value is owned memory and context that can be used with local AI and, in a future Provider Account Bridge, with the user’s existing ChatGPT, Claude, Gemini, and future provider accounts from one Cyro-controlled workspace.

## Target User

Primary ICP:
- AI-heavy users using multiple AI tools daily.
- Builders, founders, students, engineers, and privacy-conscious professionals who repeat context across GPT, Claude, Gemini, notes, and files.
- Users who want a phone-first assistant that can remember, summarize, prepare context, and work offline.

## Core User Problem

Users repeatedly explain the same personal/project context across multiple AI apps. Their memory is fragmented across ChatGPT, Claude, Gemini, notes, files, and devices. Cloud models are powerful but do not own the user’s full private context. Local tools are private but often weak or fragmented. Users should not have to jump between separate AI apps and re-explain context; Cyro should provide one chat-first workspace where local memory, vault, privacy filtering, and provider routing are controlled by Cyro.

## Product Promise

Cyro remembers what the user approves, compresses it into structured local memory, carries a compact snapshot on phone, and prepares the right context for any AI workflow. Provider Account Bridge extends that promise by letting users route a prompt from one Cyro composer to Local, ChatGPT, Claude, Gemini, or future providers while Cyro owns the memory, vault, privacy filter, routing policy, and sync layer.

## MVP Scope

MVP focuses on:
1. Mobile Memory UX
2. Memory Inspector
3. Context Capsule Builder
4. Mobile Snapshot
5. Import-to-Memory
6. Structured Memory Contracts
7. Resource-safe Local Quick Draft placeholder
8. Runtime Intelligence Layer contracts for local brain routing

MVP does not include:
- VPN/Secure Route
- real provider webviews
- provider automation
- AgentScope
- cloud APIs
- real local model runtime
- laptop offload implementation
- same-Wi-Fi discovery
- real offline STT/TTS

## Runtime Intelligence Layer

The Runtime Intelligence Layer prepares the Local Brain phase. It decides model, quantization, route, and future offload policy from device resources, benchmark evidence, installed models, user settings, battery, thermal state, and trusted future laptop/node availability.

Fast, Think, and Pro are routing modes, not hardcoded model names. Local 0.8B remains the always-available fallback. Cyro must not assume every device can run 3B or larger models.

Runtime decisions must be explainable to the user. The product must be able to show why Cyro selected Local 0.8B, downgraded quantization, blocked a larger model, deferred work, or required approval for future offload.

Laptop offload is a future trusted route. It requires explicit trusted device pairing, visible route explanation, and user approval when prompt privacy impact changes. Same-Wi-Fi discovery and offload transport are not part of this phase.

## Provider Account Bridge

Provider Account Bridge is a future major capability that makes Cyro the private command center for local AI, existing AI accounts, memory, and documents. Users bring their own logged-in provider accounts into Cyro without giving Cyro provider API keys.

The intended user experience is a single Gemini-like chat workspace, not three separate browser tabs and not a right-side provider-card panel. Provider selection belongs in the Cyro composer.

The composer contract is:
- left-side plus button for documents and images
- center Cyro message input
- right-side provider selector defaulted to Local
- provider options for Local, ChatGPT, Claude, and Gemini
- reasoning selector for Fast, Think, and Pro
- send button at the far right

The composer has a route selector for:
- Local
- ChatGPT
- Claude
- Gemini
- future providers

Cyro controls:
- Ghost Tree memory
- vault context
- prompt privacy filtering
- provider routing state
- provider-response import
- user-approved memory proposal flow
- sync of Cyro-owned memory/config/history only

Provider sessions, when implemented, must be isolated, user-visible, and user-authenticated. The user logs in manually. Cyro must not store provider passwords, export provider cookies, manipulate provider cookies, bypass CAPTCHA, bypass rate limits, bypass provider terms, or automate hidden provider activity.

Provider APIs are not part of Provider Account Bridge. Any API-key or official API provider mode requires a separate future task and architecture approval.

Current approved provider behavior is limited to safe external-browser fallback for ChatGPT, Claude, and Gemini. Cyro opens the provider from an allowlisted route, does not send the prompt automatically, and shows External Provider Opened or an exact error state.

Future embedded provider sessions must be approved through the Provider Account Bridge ADR, Provider Session Container design, and Provider Session Security contract before implementation. Until then, Cyro must not claim that provider chats continue fully inside Cyro.

### Provider Account Bridge User Stories

- As a user, I can choose Local, ChatGPT, Claude, Gemini, or a future provider from one Cyro composer.
- As a user, I can keep using Local mode when provider accounts are offline, logged out, blocked, or unavailable.
- As a user, I see a local privacy warning before external provider send when Cyro detects secrets, PII, private documents, or sensitive memory.
- As a user, I can choose redact, send as-is, or Local Only after a sensitive prompt warning.
- As a user, provider responses can be summarized into Ghost Tree memory proposals, but only I can approve the final memory write.

### Provider Account Bridge Acceptance Criteria

- Unified composer includes a route selector for Local, ChatGPT, Claude, Gemini, and future providers.
- Provider selection lives in the composer, not a right panel or browser-tab manager.
- Current provider routes use external-browser fallback only until embedded sessions are approved.
- Provider routes do not automatically send prompts.
- External provider send is preceded by a local Prompt Privacy Filter.
- Sensitive-data warning offers redact, send as-is, or Local Only.
- Provider sessions are user-owned and user-authenticated.
- Provider output can enter Cyro memory only through explicit user-approved import.
- Provider-derived Ghost Tree memory proposals require user approval before write.
- Local 0.8B remains available even when providers are unavailable.
- Provider Shell feels like one chat-first Cyro workspace, not a browser tab UI.

### Provider Account Bridge Non-Goals

- No API-key wrapper positioning.
- No hidden scraping.
- No auto-login.
- No cookie export.
- No cookie manipulation.
- No CAPTCHA bypass.
- No rate-limit bypass.
- No provider terms bypass.
- No stealth automation.
- No claim that Cyro replaces ChatGPT, Claude, or Gemini.
- No claim that provider sessions are invisible or untraceable.

## Success Metrics

- User can inspect and edit memory.
- User can see what context Cyro will add before sending.
- Imported provider output becomes history + memory candidate, not direct memory.
- Mobile Snapshot summarizes profile, projects, entities, preferences, and recent decisions.
- Fast path never requires provider tab, VPN, desktop node, or full vault scan.
- Provider Account Bridge prompts are privacy-scanned before external provider send.
- Provider-derived memory is proposed, source-linked, and user-approved before Ghost Tree write.

## UX Principles

- Mobile-first.
- One-handed.
- Fast local feedback.
- Clear source/confidence for memory.
- No black-box memory.
- No provider automation.
- User control over what context is included.
- One composer, many routes, with Cyro-owned memory and privacy controls.
