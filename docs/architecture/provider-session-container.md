# Provider Session Container Design Contract

## Purpose

This document defines the design constraints for any future embedded provider session container. It is a contract for research and implementation planning, not an implementation approval.

Provider sessions must let the user access their own provider account from a Cyro chat-first workflow while keeping Cyro away from provider credentials, cookies, DOM content, and automated interaction.

## Current State

CYRO-SPIKE-0004 uses external-browser fallback for ChatGPT, Claude, and Gemini. That fallback is safe and explicit, but it does not provide the final embedded Cyro experience.

No embedded provider session is implemented.

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
