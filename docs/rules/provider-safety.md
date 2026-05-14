# Provider Safety Rules

Allowed:
- unified Provider Account Bridge UX later
- isolated, user-visible provider session containers later
- user-owned and user-authenticated provider sessions later
- manual prompt handoff
- user-triggered clipboard/share/paste import
- local Prompt Privacy Filter before external provider send
- sensitive-data choices: redact, send as-is, or Local Only
- provider-derived Ghost Tree memory proposals with user approval
- official API/BYOK/managed credits only as a separately authorized future API mode
- official OAuth for Gmail/Drive/Calendar
- official MCP/tools later

Blocked:
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
- provider APIs for Provider Account Bridge unless a future task explicitly authorizes API mode
- using consumer subscriptions as backend

Any task requiring blocked behavior must stop and propose a safe alternative.

Provider responses may enter Cyro memory only through explicit user-approved import. Provider-derived facts must be proposed as Ghost Tree memory candidates before any write.
