# Cyro Security Checklist

## Provider Boundary
- [ ] No cookie capture
- [ ] No cookie export
- [ ] No cookie manipulation
- [ ] No session mirroring
- [ ] No DOM scraping
- [ ] No output mirroring
- [ ] No auto-send
- [ ] No auto-login
- [ ] No CAPTCHA bypass
- [ ] No rate-limit bypass
- [ ] No provider terms bypass
- [ ] No stealth automation
- [ ] No provider APIs for Provider Account Bridge unless a future task explicitly authorizes API mode
- [ ] Provider responses imported only by explicit user approval or a separately approved official API mode

## Provider Session Security
- [ ] Provider sessions are isolated and user-visible
- [ ] Provider login is manually controlled by the user
- [ ] Cyro stores no provider passwords
- [ ] React state contains no provider passwords, cookies, tokens, or privileged provider session data
- [ ] Rust/Tauri owns privileged provider/session boundaries
- [ ] Prompt Privacy Filter runs before external provider send
- [ ] Sensitive prompt warning offers redact, send as-is, or Local Only
- [ ] User consent is required before provider send

## Memory Boundary
- [ ] No silent memory updates
- [ ] Provider imports create candidates only
- [ ] Provider-derived Ghost Tree memory proposals require user approval
- [ ] Memory approval UI exists
- [ ] Context Capsule uses approved memory only
- [ ] Raw vault excluded by default

## Local Storage
- [ ] Encrypted history planned
- [ ] Blob storage lazy-loaded
- [ ] Checksums on snapshots
- [ ] Event log append-only

## Runtime
- [ ] Phone does not keep multiple models hot
- [ ] Heavy compile deferred to desktop
- [ ] Fast path does not require VPN/provider/desktop

## Git/Release
- [ ] Task branch from dev
- [ ] Tests/checks run
- [ ] Review score 10/10 before merge
