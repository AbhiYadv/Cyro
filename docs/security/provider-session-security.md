# Provider Session Security Contract

## Purpose

This security contract defines what must remain true for Provider Account Bridge work. It applies to current external fallback and any future embedded provider session design.

## Security Decision

Cyro may help the user reach a provider account session, but Cyro must not become a provider automation layer. Provider access is user-owned, user-visible, and user-controlled.

## Current Approved Behavior

Current approved behavior:
- Local route sends to Cyro local or mocked runtime.
- ChatGPT, Claude, and Gemini routes open external-browser fallback only.
- Prompt is not sent automatically to providers.
- Provider URLs are selected from a hardcoded allowlist.
- No provider response is imported automatically.
- No provider credentials, cookies, tokens, or sessions are handled by Cyro.

## CYRO-PROVIDER-008 Feasibility Review Addendum

The 2026-05-18 feasibility review found that the current embedded shell is iframe-based. ChatGPT was observed as blank or blocked inside the Cyro layout, so iframe embedding is likely unsuitable for final provider shell UX. Claude and Gemini were not manually validated in this review, so no embedded-session success is claimed for them.

This finding does not authorize a bypass. The next safe container path is Tauri-native child webview or `WebviewWindow` session container research, with explicit proof that React cannot read provider cookies, tokens, DOM, or response content.

## CYRO-PROVIDER-009 Shell UX Security Addendum

CYRO-PROVIDER-009 is a React shell UX prototype only. It may render the Cyro-owned header, drawer, tools tray, route selector, reasoning selector, Send/Stop control, compact diagnostics, and blocked-provider explanation. Provider shell is not validated yet. Gemini is available as a route in the shell prototype, but manual embedded-session validation is still pending.

It does not authorize or implement provider APIs, provider SDKs, scraping, DOM reading, auto-login, credential storage, cookie capture, cookie export, prompt injection, automated prompt sending, provider response capture, provider memory import, or bypass behavior. Provider routes remain visible shell state until a separate Tauri-native provider container research task proves an acceptable session boundary. Iframe embedding remains a feasibility result, not the final provider-shell solution. CYRO-PROVIDER-010 must validate a Tauri-native visible webview/session container with no DOM, cookie, credential, prompt, or response capture.

## Future Embedded Session Conditions

Embedded provider sessions may be considered only if all of these are satisfied:
- session is visible to the user
- login is manual
- provider origin is allowlisted
- frontend sends provider id, not URL
- Rust/Tauri owns privileged session creation
- React cannot read cookies, tokens, DOM, or provider response text
- no automated prompt injection exists
- no automated response capture exists
- provider blockers are reported without bypass attempts
- user can choose Local Only at any sensitive-data gate

## Explicitly Forbidden

Forbidden in all Provider Account Bridge work:
- provider APIs unless a separate future API-mode task authorizes them
- provider API SDK dependencies
- auto-login
- credential storage
- cookie capture
- cookie export
- cookie copy
- cookie manipulation
- token inspection
- session mirroring
- hidden webviews
- hidden background provider activity
- DOM scraping
- output mirroring
- automated prompt sending
- automated response capture
- CAPTCHA bypass
- rate-limit bypass
- provider terms bypass
- stealth automation
- provider response memory writes without user approval
- raw vault or raw memory exposure to providers by default

## Prompt Privacy Gate

Before any future provider-bound send, Cyro must run a local Prompt Privacy Filter.

The filter must identify at least:
- secrets
- credentials
- personal identifiers
- medical or financial data
- private documents
- raw vault snippets
- raw user profile or memory content
- sensitive project or workplace context

If sensitive data is detected, user options must be:
- redact
- send as-is
- Local Only

The user decision must be visible and auditable in Cyro-owned metadata.

## Memory And Import Gate

Provider output can enter Cyro only through explicit user action.

Allowed import path:
1. User manually imports provider output.
2. Cyro stores import as history or candidate according to approved storage policy.
3. Cyro summarizes locally where required.
4. Cyro creates Ghost Tree memory proposals.
5. User approves or rejects each memory write.

Blocked import path:
- automatic provider response capture
- DOM extraction
- stream mirroring
- silent memory write
- direct write to `user.md` or `memory.md`

## Storage Rules

Allowed storage:
- provider id
- route selected
- external fallback opened status
- safe error detail
- user-approved import metadata
- user-approved memory proposal metadata

Blocked storage:
- provider username
- provider password
- provider cookies
- provider tokens
- provider local storage
- provider session handles
- provider DOM
- provider response content unless explicitly imported

## Security Review Checklist

Before any embedded session implementation can merge:
- [ ] Arbitrary URL input is rejected.
- [ ] Provider origins are hardcoded and allowlisted.
- [ ] React state contains no credentials, cookies, tokens, or provider DOM.
- [ ] Rust/Tauri owns privileged session/open behavior.
- [ ] No provider API SDKs are introduced.
- [ ] No prompt injection code exists.
- [ ] No response capture code exists.
- [ ] No DOM scraping code exists.
- [ ] Prompt Privacy Filter blocks or gates sensitive prompts.
- [ ] Provider response import requires explicit user action.
- [ ] Ghost Tree memory writes require user approval.
- [ ] Provider blocked/error states are visible.
- [ ] External fallback remains available.
