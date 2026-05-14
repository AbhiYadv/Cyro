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

## Provider Boundary

Future provider tabs are visible and user-controlled. Cyro never captures cookies, mirrors sessions, auto-sends, scrapes DOM, or uses consumer subscriptions as backend infrastructure.

## Sync Boundary

Sync uses append-only event logs and compact snapshots. No blind full database dumping.

## MVP Boundary

Build memory and context first. Defer provider tabs, VPN, AgentScope, cloud APIs, MCP production tools, and offline STT/TTS.
