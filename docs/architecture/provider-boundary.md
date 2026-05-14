# Provider Boundary

## Provider Account Bridge Position

Provider Account Bridge is a future user-owned account bridge, not an API wrapper. Cyro should expose one chat-first composer with route choices for Local, ChatGPT, Claude, Gemini, and future providers while Cyro owns Ghost Tree memory, vault context, prompt privacy scanning, and memory import approval.

## Allowed Later

- unified provider route selector in one Cyro composer
- isolated, user-visible provider session containers
- manual user login to provider accounts
- prompt privacy scan before external provider send
- sensitive-data choices: redact, send as-is, or Local Only
- user-approved provider response import
- provider-derived Ghost Tree memory proposals
- provider health/status display
- separate future official API mode only if explicitly authorized by a future task

## Blocked

- cookie capture
- cookie export
- cookie manipulation
- session mirroring
- DOM scraping
- output mirroring
- auto-send
- auto-login
- hidden provider automation
- CAPTCHA bypass
- rate-limit bypass
- provider terms bypass
- stealth automation
- provider API integration for Provider Account Bridge
- using ChatGPT/Claude/Gemini consumer subscriptions as backend

## Provider History

Cyro stores prepared prompt metadata by default. Provider responses enter Cyro only after user import or official API response.

For Provider Account Bridge, provider responses enter Cyro history or Ghost Tree memory only after explicit user approval. Provider-derived memory must be represented as a memory proposal with source, confidence, sensitivity, status, and timestamp before any approved write.
