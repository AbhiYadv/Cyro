# Provider Session Container Design Contract

## Purpose

This document defines the design constraints for any future embedded provider session container. It is a contract for research and implementation planning, not an implementation approval.

Provider sessions must let the user access their own provider account from a Cyro chat-first workflow while keeping Cyro away from provider credentials, cookies, DOM content, and automated interaction.

## Current State

CYRO-SPIKE-0004 uses external-browser fallback for ChatGPT, Claude, and Gemini. That fallback is safe and explicit, but it does not provide the final embedded Cyro experience.

CYRO-PROVIDER-008 adds a feasibility shell inside the Cyro workspace. It maps provider ids to hardcoded allowlisted origins through Rust/Tauri, then renders the selected origin in a React iframe. This is a prototype and does not prove product success until manual login/chat behavior is validated per provider.

External browser fallback is temporary and only used when embedded provider session is unavailable, blocked, or not yet implemented.

Final Provider Account Bridge UX target: ChatGPT, Claude, Gemini, and future providers open inside Cyro's chat-first UX, not as separate browser windows.

## Future Container Requirements

A production provider session container must be:
- user-visible
- user-authenticated
- isolated by provider
- created only from hardcoded provider ids and allowlisted origins
- controlled by Rust/Tauri for privileged boundaries
- unable to expose provider cookies, tokens, DOM, or response text to React
- unable to run hidden provider activity
- clear about provider-owned content versus Cyro-owned UI
- embedded inside Cyro's chat-first workspace rather than opened as a separate browser window

Provider origins:
- ChatGPT: `https://chatgpt.com`
- Claude: `https://claude.ai`
- Gemini: `https://gemini.google.com`

Frontend must pass provider id only. It must not pass arbitrary URLs.

## CYRO-PROVIDER-008 Feasibility Prototype

The prototype tests whether the following provider origins can appear inside Cyro's visible workspace:
- `chatgpt` -> `https://chatgpt.com`
- `claude` -> `https://claude.ai`
- `gemini` -> `https://gemini.google.com`

Implementation mechanism:
- Current branch uses a React `<iframe>` in `ProviderSessionSurface`.
- Rust/Tauri only resolves hardcoded provider ids to allowlisted origins through `get_provider_session`.
- Current branch does not create a Tauri child webview, Tauri `WebviewWindow`, or isolated native session container.

Feasibility review result on 2026-05-18:

| Provider | Origin | Mechanism | Manual result | Feasibility finding |
|---|---|---|---|---|
| ChatGPT | `https://chatgpt.com` | React iframe | Observed blank or blocked provider area inside the Cyro layout | Iframe embedding is likely unsuitable for ChatGPT final UX. Do not claim the embedded session works. |
| Claude | `https://claude.ai` | React iframe | Not manually tested in this review | No success claim. Must be tested in native app before any embedded UX claim. |
| Gemini | `https://gemini.google.com` | React iframe | Not manually tested in this review | No success claim. Must be tested in native app before any embedded UX claim. |

Iframe conclusion:
- ChatGPT's blank or blocked result makes iframe embedding unsuitable as the final Provider Account Bridge surface.
- Claude and Gemini cannot be treated as successful because they were not manually validated in this review.
- The UI must show a blocked/blank explanation when a provider refuses to render and expose only an explicit user-triggered fallback.
- No unsafe workaround is permitted. Do not bypass frame, CSP, login, account security, or provider terms protections.

Next implementation path:
- CYRO-PROVIDER-009 builds the provider shell chat UX prototype only. It is a React UI shell for the unified composer, drawer, tools menu, segmented provider pills, Fast/Think/Pro reasoning pills, Send/Stop control, compact runtime diagnostics, and honest blocked-provider state.
- CYRO-PROVIDER-010 should become Provider Shell Surface v2 using Tauri-native webview/session container research.
- Research must compare Tauri child webview and `WebviewWindow` behavior for provider origins loaded as top-level native webviews, not iframes.
- A native webview may avoid iframe-specific frame restrictions, but it is not approved until provider terms, platform behavior, storage partitioning, navigation limits, lifecycle cleanup, and cookie/DOM isolation are proven.
- The v2 task must keep provider sessions visible, manual, user-controlled, and isolated from React. It must not add provider APIs, scraping, auto-login, DOM reading, prompt automation, response capture, memory import, cookie capture, credential storage, or protection bypasses.

Security boundary:
- React passes provider id only.
- Rust/Tauri resolves provider id to the hardcoded allowlisted origin.
- Unknown provider ids and arbitrary URLs are rejected.
- Provider cookies, credentials, DOM, and response content are not exposed to React.
- Cyro does not automate login, prompt sending, response reading, import, or memory writes.

Blocked behavior:
- Providers may refuse embedded display with CSP, frame, login, or account security restrictions.
- The shell must show a blocked/fallback state instead of attempting a bypass.
- External browser fallback remains explicit and user-triggered only when embedding is unavailable or blocked.

Manual feasibility findings are not complete until ChatGPT, Claude, and Gemini are each tested in the native app for visible load, manual login, typing/chat usability, and degraded or blocked behavior.

## CYRO-PROVIDER-009 Shell UX Prototype

CYRO-PROVIDER-009 introduces a modern Cyro-owned provider shell around the existing route model:
- left drawer for search, new chat, recent chats, memory, vault, and provider sessions
- top provider header with selected route, session status, generation state, and compact diagnostics control
- full-height chat/provider stage
- bottom composer with tools button, segmented Local/ChatGPT/Claude/Gemini provider pills, Fast/Think/Pro reasoning pills, and visible Send/Stop control
- polished blocked state for ChatGPT's blank or blocked iframe feasibility result

This task is UX shell only. The route selector is shell state, not evidence that provider hosting works. ChatGPT, Claude, and Gemini are route prototypes and must be labeled as blocked, unvalidated, or container pending until a native container task proves otherwise. It does not create a provider webview container, does not load provider sessions through Tauri-native webviews, does not send prompts to providers, and does not import provider answers.

Provider shell is not validated yet. Gemini is available as a route in the shell prototype, but manual embedded-session validation is still pending. The iframe conclusion remains unchanged: iframe embedding remains a feasibility result, not the final provider-shell solution. ChatGPT is recorded as blank or blocked in an iframe, and Claude/Gemini remain unvalidated until separately tested. The shell may present selected provider routes and explicit fallback links, but it must not claim provider login or chat works inside Cyro. CYRO-PROVIDER-010 must validate a Tauri-native visible webview/session container with no DOM, cookie, credential, prompt, or response capture.

## CYRO-PROVIDER-010 Native Webview Container Research

CYRO-PROVIDER-010 adds a narrow Tauri-native provider container spike. React can request a provider container by provider id only. Rust resolves `chatgpt`, `claude`, or `gemini` to a hardcoded origin and opens a visible Tauri `WebviewWindow` for that provider:
- `chatgpt` -> `https://chatgpt.com`
- `claude` -> `https://claude.ai`
- `gemini` -> `https://gemini.google.com`

Unknown provider ids and arbitrary URL strings are rejected before any webview is opened. The frontend never passes provider URLs. The spike uses visible provider windows as the first native container result because an in-panel child webview needs separate sizing, lifecycle, cross-platform, and navigation research before it can be treated as product UX.

The native container spike does not inject JavaScript into provider pages, does not read DOM, does not inspect or export cookies, does not store provider credentials, does not automate login, does not send prompts, does not capture provider responses, and does not import provider output into Cyro memory. Provider content remains provider-owned and user-controlled.

The WebviewWindow is opened in incognito mode for this spike so Cyro does not intentionally persist provider cookies or credentials in a Cyro-managed provider store. This supports feasibility research, but it means persistent login behavior is not proven.

Manual validation status from `pnpm tauri dev` on 2026-05-19:

| Provider | Native mechanism | Manual result | Feasibility finding |
|---|---|---|---|
| ChatGPT | Tauri WebviewWindow | Visible provider-owned ChatGPT page loaded at `chatgpt.com/` with logged-out login/sign-up controls. | Native top-level webview can display ChatGPT's logged-out surface. Login and chat usability were not validated because no account login or prompt entry was performed. |
| Claude | Tauri WebviewWindow | Visible Claude login surface loaded at `claude.ai/login` and showed provider-owned cookie controls. | Native top-level webview can display Claude's login surface. Login and chat usability were not validated because no account login or prompt entry was performed. |
| Gemini | Tauri WebviewWindow | Visible Gemini surface loaded at `gemini.google.com/app` with sign-in link and logged-out prompt field. | Native top-level webview can display Gemini's logged-out surface. Login and chat usability were not validated because no account login or prompt entry was performed. |

Iframe embedding remains unsuitable as the final provider-shell solution unless a provider is separately proven otherwise. CYRO-PROVIDER-010 proves that a separate visible native WebviewWindow can load all three provider origins in logged-out state on this macOS validation run. It does not prove persistent sessions, account login, provider chat, in-layout child webview UX, cross-platform behavior, provider terms compatibility, or provider response import.

## Session Isolation Questions

The implementation task must answer these questions before merge:
- Can each provider run in a distinct webview/session partition?
- Can provider storage be isolated per provider and per Cyro profile?
- Can lifecycle cleanup happen without reading or exporting cookies?
- Can Cyro show provider availability without session introspection?
- Can provider blockers be surfaced without bypass attempts?
- Can embedded provider content be clearly labeled as external provider content?
- Can app permissions prevent arbitrary navigation and arbitrary external opens?

If these cannot be answered with evidence, Cyro must keep external-browser fallback.

## Allowed User Actions

Allowed later after review:
- open a visible provider session
- manually log in inside provider-owned UI
- manually type or paste into provider-owned UI
- manually copy/share/paste provider output into Cyro import flow
- close provider session
- clear provider container data through an explicit user action

## Blocked Actions

Always blocked:
- auto-login
- automated prompt sending
- DOM scraping
- response capture
- cookie capture
- cookie export
- cookie manipulation
- token inspection
- hidden background provider windows
- keep-alive automation
- CAPTCHA bypass
- rate-limit bypass
- provider terms bypass
- subscription routing

## Chat-First Surface Contract

The primary Cyro UI remains the chat composer:
- plus button for docs/images
- prompt input
- provider selector defaulted to Local
- reasoning selector Fast/Think/Pro
- send button

Provider Account Bridge final UX requires the provider surface to appear inside Cyro's chat workspace after the user chooses a provider route. The provider surface must feel integrated into Cyro's chat-first UX while staying clearly labeled as provider-owned content.

Cyro remains the control plane for memory, vault, privacy filtering, provider route selection, and context capsule preparation.

Provider-owned content must remain visible and user-controlled inside an isolated Cyro provider surface.

The embedded provider surface, if approved later, must support the chat-first model:
- it must not replace the main Cyro composer with provider tabs
- it must not add right-side provider cards as the primary interaction
- it must clearly mark provider-owned content
- it must keep Cyro status, privacy warnings, and memory import controls separate from provider content

## Data Handling

Cyro may store:
- selected provider route
- coarse provider handoff status
- user-approved import metadata
- user-approved memory proposal metadata
- safe error strings

Cyro must not store:
- provider passwords
- provider cookies
- provider tokens
- provider session handles
- provider DOM snapshots
- provider response text unless the user explicitly imports it
- raw vault content sent to provider without approval

## Required Tests For Future Implementation

Future implementation must include tests or documented manual verification for:
- arbitrary URL rejection
- provider id allowlist enforcement
- no provider cookies exposed to React
- no DOM scraping utilities
- no automated prompt injection
- no provider response capture
- visible error state when provider blocks embedding
- Local route remains available without provider session
- provider-derived memory cannot write without approval

## Open Research Items

- Tauri webview partitioning and persistence model.
- macOS, Windows, and Linux behavior differences.
- Provider terms compatibility for embedded login surfaces.
- Navigation restrictions after provider login.
- User-controlled provider data clearing.
- Accessibility and keyboard behavior inside embedded provider content.
- Safe fallback if a provider blocks embedded login.
