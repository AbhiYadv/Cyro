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

MVP does not include:
- VPN/Secure Route
- real provider webviews
- provider automation
- AgentScope
- cloud APIs
- real local model runtime
- real offline STT/TTS

## Provider Account Bridge

Provider Account Bridge is a future major capability that makes Cyro the private command center for local AI, existing AI accounts, memory, and documents. Users bring their own logged-in provider accounts into Cyro without giving Cyro provider API keys.

The intended user experience is a single Gemini-like chat workspace, not three separate browser tabs. The composer has a route selector for:
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

### Provider Account Bridge User Stories

- As a user, I can choose Local, ChatGPT, Claude, Gemini, or a future provider from one Cyro composer.
- As a user, I can keep using Local mode when provider accounts are offline, logged out, blocked, or unavailable.
- As a user, I see a local privacy warning before external provider send when Cyro detects secrets, PII, private documents, or sensitive memory.
- As a user, I can choose redact, send as-is, or Local Only after a sensitive prompt warning.
- As a user, provider responses can be summarized into Ghost Tree memory proposals, but only I can approve the final memory write.

### Provider Account Bridge Acceptance Criteria

- Unified composer includes a route selector for Local, ChatGPT, Claude, Gemini, and future providers.
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
