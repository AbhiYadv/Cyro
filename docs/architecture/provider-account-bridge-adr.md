# ADR: Embedded Provider Session and Chat-First UX Contract

## Status

Proposed for architecture review.

## Decision

Cyro will keep provider routing inside the main chat composer. The production Provider Account Bridge must feel like one Cyro chat workspace with selectable routes, not a browser tab manager or a right-side provider card panel.

Final Provider Account Bridge UX target: ChatGPT, Claude, Gemini, and future providers open inside Cyro's chat-first UX, not as separate browser windows.

Current implementation state:
- Local route sends to the Cyro local or mocked runtime.
- CYRO-PROVIDER-008 adds a visible provider feasibility shell for ChatGPT, Claude, and Gemini using Rust/Tauri allowlisted provider ids and origins plus a React iframe surface.
- The 2026-05-18 feasibility review observed ChatGPT as blank or blocked in the iframe. Iframe embedding is likely unsuitable for ChatGPT/Claude/Gemini final UX unless a provider is separately proven otherwise.
- CYRO-PROVIDER-008 does not use a Tauri child webview, `WebviewWindow`, or native session container.
- CYRO-PROVIDER-009 is only a route-prototype shell. Provider shell is not validated yet; Gemini is available as a route in the shell prototype, but manual embedded-session validation is still pending.
- ChatGPT, Claude, and Gemini routes may still use a safe external-browser fallback only as temporary spike behavior or blocked-provider fallback.
- Cyro does not send prompts automatically to providers.
- Cyro shows external-provider handoff status only.

Future production target:
- A provider login/session must appear inside a Cyro-controlled provider surface after a separate implementation task proves isolation, terms compliance, and security controls.
- The user manually logs in to the provider.
- The user manually sends the provider prompt unless a future ADR explicitly approves a safer assisted flow.
- Provider responses enter Cyro only by explicit user import.
- Ghost Tree memory proposals from provider output require user approval before any write.

This ADR does not authorize provider API integrations, browser automation, scraping, provider-response capture, cookie handling, credential storage, or memory-import implementation.

## Final UX Target

The final product target is embedded in-Cyro provider sessions. The user should be able to choose ChatGPT, Claude, Gemini, or future providers from the Cyro composer and continue inside the Cyro workspace without leaving to a separate browser window.

External browser fallback is temporary and only used when embedded provider session is unavailable, blocked, or not yet implemented.

Embedded provider session feasibility is a required product milestone before Provider Account Bridge can be considered product-complete. The milestone must prove that provider-owned content can remain visible and user-controlled inside an isolated Cyro provider surface without exposing cookies, credentials, DOM, or response content to Cyro code.

CYRO-PROVIDER-008 records feasibility status only. It does not claim that provider login or chat works until the user manually validates ChatGPT, Claude, and Gemini inside the native app. ChatGPT's observed blank/blocked iframe means the iframe route is not acceptable as final provider shell UX. Iframe embedding remains a feasibility result, not the final provider-shell solution. If a provider blocks embedding, Cyro must show a blocked state and expose only an explicit user-triggered external fallback. CYRO-PROVIDER-010 must validate a Tauri-native visible webview/session container with no DOM, cookie, credential, prompt, or response capture.

Cyro remains the control plane for memory, vault, privacy filtering, provider route selection, and context capsule preparation.

Provider-owned content must remain visible and user-controlled inside an isolated Cyro provider surface.

## Context

The CYRO-SPIKE-0004 result proved that an external browser fallback can safely open user-owned ChatGPT, Claude, and Gemini sessions. That fallback is safe, temporary, and explicitly not the final product UX. The desired product direction is a Gemini-like Cyro composer where Local, ChatGPT, Claude, Gemini, and future providers are routes inside one Cyro-owned chat surface.

The product risk is that provider access can drift into forbidden behavior: browser automation, session mirroring, cookie export, DOM scraping, prompt injection, provider API wrapping, or hidden background provider use. The architecture must keep user agency and provider boundaries explicit.

## UX Contract

The composer layout is locked for Provider Account Bridge work:
- Left side: plus button for docs/images.
- Center: Cyro message input.
- Right side: provider selector defaulted to Local.
- Provider options: Local, ChatGPT, Claude, Gemini.
- Next to provider selector: reasoning selector Fast, Think, Pro.
- Send button at far right.

Behavior contract:
- Local sends through Cyro's local runtime path.
- ChatGPT, Claude, and Gemini must ultimately open inside Cyro's chat-first UX through visible isolated provider sessions.
- External browser fallback is allowed only while embedded sessions are unavailable, blocked, or not yet implemented.
- Provider routes must not auto-send the prompt.
- Provider routes must show a visible handoff or blocked/error state.
- Provider interactions must remain user-visible.
- Provider session state must not be represented as confirmed login state unless Cyro has a safe, approved status mechanism.

UX non-goals:
- No browser-tab manager UX.
- No separate right-side ChatGPT/Claude/Gemini provider cards.
- No hidden browser automation.
- No fake claim that provider chats are fully inside Cyro until embedded sessions are implemented and reviewed.

## Architecture Contract

Required route model:
- `local`
- `chatgpt`
- `claude`
- `gemini`
- future provider ids
- later optional `auto` only after routing policy approval

Required provider state model:
- provider id
- route availability
- user action required
- external fallback opened
- embedded surface available
- provider blocked
- error detail safe for UI display
- timestamp

Required consent model:
- prompt privacy scan result
- sensitive categories
- user decision: redact, send as-is, or Local Only
- context capsule approval state
- provider send approval state
- provider response import approval state

Required import model:
- provider id
- user import action
- source timestamp
- raw response storage policy
- summary candidate
- Ghost Tree memory proposal ids
- user approval or rejection

## Trust Boundary

React frontend:
- Displays route, handoff status, privacy scan status, and user decisions.
- Must not own provider credentials, cookies, tokens, session handles, or privileged provider data.
- Must not inspect provider DOM or provider response content.

Rust/Tauri backend:
- Owns privileged system boundaries.
- Owns allowlisted external open or approved embedded session container creation.
- Must map provider ids to hardcoded allowlisted provider origins.
- Must reject arbitrary provider URLs from frontend code.
- Must not expose provider cookies, tokens, page DOM, or response content to React.

Cyro memory system:
- Owns memory candidates, approved memory, Ghost Tree proposals, and Context Capsules.
- Must not accept provider-derived memory without explicit user approval.
- Must not include raw vault or sensitive memory in provider-bound context by default.

Provider-owned surface:
- Owns provider login and provider conversation UI.
- Must remain visible to the user.
- Must not be used as a hidden execution backend.

## Forbidden Behavior

Provider Account Bridge must never include:
- provider API integration unless a separate future API mode explicitly authorizes it
- provider username or password storage
- cookie capture, cookie export, cookie copying, or cookie manipulation
- session mirroring
- hidden webviews
- DOM scraping
- automated response capture
- prompt injection into provider pages
- auto-login
- CAPTCHA bypass
- rate-limit bypass
- provider terms bypass
- stealth automation
- raw vault injection into provider prompts
- silent memory updates from provider responses
- using consumer subscriptions as a Cyro backend

## Failure Behavior

If embedded provider sessions are blocked, unsupported, or legally unsafe:
- Cyro may fall back to explicit external-browser handoff.
- The UI must show a visible blocked/error state.
- No retry loop may become hidden automation.
- No attempt may bypass provider protections.
- The user's prompt must remain under user control.

If privacy scan detects sensitive content:
- Cyro must offer redact, send as-is, or Local Only.
- Local Only must be available even when providers are unavailable.
- Any provider send must be user-approved.

If provider output is available for import:
- Import must be user-triggered.
- The imported response must become history or memory candidate only.
- Ghost Tree memory writes require user approval.

## Implementation Gate

Before embedded provider implementation starts, Cyro needs:
- Provider Session Container Design review.
- Provider Session Security review.
- Provider terms and compliance review.
- Prompt Privacy Scanner contract.
- Manual response import contract.
- Ghost Tree memory proposal contract.
- Tests proving blocked behavior remains blocked.

## Consequences

Benefits:
- Keeps Cyro chat-first.
- Preserves user-owned memory and privacy as the control plane.
- Avoids provider API and scraping risk.
- Leaves room for future embedded UX without pretending it exists today.

Tradeoffs:
- Current provider routes remain external fallback until the container design is proven.
- Provider response import remains manual and separate from this ADR.
- Some providers may block embedded surfaces; Cyro must not bypass them.
