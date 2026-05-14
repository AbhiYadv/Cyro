# Memory Engine Architecture

## Purpose

Cyro memory is not chat history. It is compressed, structured, time-aware context.

## Layers

1. Raw Event Log
2. Memory Candidates
3. Approved Memory
4. Entities
5. Relationships
6. Temporal Memory
7. Summaries
8. Context Capsules
9. Mobile Snapshot

## Entity Types

- person
- project
- tool
- document
- place
- preference
- organization
- topic

## Memory Status

- pending
- approved
- rejected
- active
- stale
- superseded
- archived

## Memory Rules

- Provider imports create candidates only.
- Local model/compiler summarizes.
- User approves before user.md or memory.md updates.
- Stale memories are downgraded, not blindly deleted.
- Current facts override superseded facts.
