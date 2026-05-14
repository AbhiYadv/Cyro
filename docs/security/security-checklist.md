# Cyro Security Checklist

## Provider Boundary
- [ ] No cookie capture
- [ ] No session mirroring
- [ ] No DOM scraping
- [ ] No output mirroring
- [ ] No auto-send
- [ ] Provider responses imported only by user action or official API

## Memory Boundary
- [ ] No silent memory updates
- [ ] Provider imports create candidates only
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
