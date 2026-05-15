# Cyro V6 Locked Architecture

## Final Product Definition

Cyro is a mobile-first sovereign AI memory workspace. It builds private structured memory from connected sources, provider imports, chats, notes, files, and user activity. The memory is compressed into entities, relationships, temporal chains, summaries, Mobile Snapshots, and Context Capsules.

## What Cyro Is Not

- Not a ChatGPT wrapper.
- Not browser automation.
- Not a VPN-first product.
- Not a local GPT clone.
- Not a scraping product.
- Not an autonomous-agent toy.

## Memory Pipeline

Connected sources
→ raw event log
→ compression
→ structured memory
→ entity extraction
→ relationship graph
→ temporal chains
→ stale/forgetting logic
→ proactive context
→ Context Capsule
→ local/provider AI with user approval

## Mobile-First Architecture

Phone owns the daily habit loop:
- Native composer
- Local Quick Draft
- Context Capsule preview
- Mobile Snapshot
- Import-to-Memory
- Memory Inspector

The phone must remain fast, battery-safe, and useful offline.

## Desktop Role

Desktop is the heavy compiler later:
- Memory compression
- PageIndex/EvidenceTree
- full vault indexing
- relationship resolution
- temporal cleanup
- larger local models
- Mobile Snapshot generation

## Runtime Intelligence Layer

Cyro uses a Runtime Intelligence Layer to decide model, quantization, route, and future offload policy. Fast, Think, and Pro are routing modes, not hardcoded model names.

Runtime decisions must consider device hardware profile, installed model registry entries, benchmark evidence, battery, thermal state, user settings, and trusted future laptop/node availability. Cyro must not assume every device can run 3B or larger models.

Local 0.8B remains the always-available fallback. Larger local models and laptop offload require capability gates, benchmark gates, route explanation, and user consent where privacy impact changes.

Same-Wi-Fi discovery and laptop offload are future architecture work. No silent offload of prompts is allowed.

## Provider Account Bridge

Future Provider Account Bridge exposes one chat-first Cyro workspace with route choices for Local, ChatGPT, Claude, Gemini, and future providers. It must feel like one Cyro-controlled conversation surface, not separate browser tabs.

Under the hood, routing can target the local model runtime or a user-owned provider account session. Cyro's local layers remain the control plane: Ghost Tree memory, Vault, Prompt Privacy Filter, Runtime Governor, Context Capsule Builder, Import-to-Memory, and Cyro-owned sync of memory/config/history.

Provider Account Bridge uses user-visible, user-authenticated provider sessions when implemented. It does not use provider APIs for this feature unless a future task explicitly authorizes an API mode. It does not store provider passwords, export or manipulate provider cookies, bypass CAPTCHA, bypass rate limits, bypass provider terms, scrape provider output, or perform hidden automation.

External provider send requires local prompt privacy scanning. If sensitive data is detected, the user must choose redact, send as-is, or Local Only. Provider responses can produce Ghost Tree memory proposals, but user approval is required before memory writes.

Provider session container and provider terms/security ADRs are required before implementation.

## Provider Boundary

Future provider access is visible and user-controlled. Cyro never captures cookies, mirrors sessions, auto-sends, scrapes DOM, exports provider cookies, manipulates provider cookies, or uses consumer subscriptions as backend infrastructure.

## Sync Boundary

Sync uses append-only event logs and compact snapshots. No blind full database dumping.

## MVP Boundary

Build memory, context, and runtime contracts first. Defer provider session containers, provider webviews, VPN, AgentScope, cloud APIs, MCP production tools, real local model inference, mDNS discovery, laptop offload, and offline STT/TTS. Sprint 0 remains the mocked desktop shell only.
