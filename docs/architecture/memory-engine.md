# Memory Engine Architecture

## Purpose

Cyro memory is not chat history. It is compressed, structured, time-aware context that the user can inspect, approve, edit, delete, export, and audit.

Cyro Ghost Tree is a Hermes-style personal memory system built on OpenHuman-style compressed memory-tree infrastructure.

The goal is user-owned memory that can scale far beyond the active model context window while still injecting only the relevant selected slice into a prompt.

## Strategy

Cyro Ghost Tree Memory Engine combines two ideas:

- Hermes-style personalization model: defines what Cyro should remember about the user.
- OpenHuman-style memory infrastructure: defines how Cyro stores, compresses, searches, and injects memory efficiently.

Hermes-style personalization captures:
- durable user preferences
- style and tone preferences
- active projects
- important decisions
- recurring workflows
- personal constraints
- reusable skills
- approved facts about people, tools, documents, organizations, and topics

OpenHuman-style infrastructure organizes:
- raw events
- canonical chunks
- scored memory candidates
- hierarchical summaries
- Ghost Tree nodes
- Context Capsules
- rebuildable search and vector caches

Cyro maps these concepts to:
- `user.md`
- `memory.md`
- `projects.md`
- `skills/`
- approved Ghost Tree facts
- Markdown/JSON memory records
- optional derived search/vector indexes

## Source Of Truth

Ghost Tree and Markdown/JSON records are source of truth; vector/search indexes are derived caches only.

Source-of-truth records must be:
- user-visible
- editable
- deletable
- exportable
- auditable
- source-linked
- sensitivity-labeled
- stale/superseded aware

Derived caches may include:
- keyword indexes
- vector indexes
- hot memory caches
- entity lookup caches
- relationship lookup caches

Derived caches must be rebuildable from the Ghost Tree source records. They must not become hidden memory.

## Memory Pipeline

The memory pipeline is:

1. Raw events
2. Canonical chunks
3. Scored memory candidates
4. Hermes personalization filter
5. User approval
6. Ghost Tree
7. Context Capsule

Compact form: raw events -> canonical chunks -> memory candidates -> Hermes filter -> user approval -> Ghost Tree -> Context Capsule.

Expanded flow:

- Raw events capture user-approved inputs, local notes, imported provider answers, local files, and activity records.
- Canonical chunks normalize source material into durable text/data units with source metadata.
- Memory candidates score whether a chunk is worth remembering.
- Hermes personalization filter decides whether a candidate is about preferences, projects, decisions, workflows, constraints, reusable skills, or durable facts.
- User approval decides whether a candidate can become memory.
- Ghost Tree stores approved structured memory as the source of truth.
- Context Capsule Builder selects a relevant prompt-sized slice from Ghost Tree and supporting evidence.

Provider-derived memory must follow this pipeline. Provider responses create candidates only and require explicit user approval before any Ghost Tree write.

## Scale And Context Policy

Cyro targets million-token-scale retained memory as compressed/indexed local storage, not as a single local model context window.

Cyro should target 12M-token-scale retained memory as compressed/indexed storage, not as one model context window.

Cyro can target 12M-token-scale retained memory only as a storage and indexing goal. It must not claim that a phone or local 0.8B model has a 12M-token context window.

Context Capsule Builder injects only the relevant selected slice into the model.

Initial Context Capsule target:
- about 1k-8k tokens of relevant selected context
- explicit user-visible preview before provider/cloud use
- raw vault excluded by default
- approved memory only by default
- evidence snippets selected intentionally

Large retained memory stays outside active model context. Runtime and memory services retrieve, summarize, and compress before injection.

## Fast Memory Injection

Fast memory injection must be designed for sub-second perceived retrieval where possible.

Fast path rules:
- do not scan the full vault on every prompt
- do not require provider tabs
- do not require sync
- do not require laptop offload
- do not require AgentScope
- use hot cache and Ghost Tree summaries first
- degrade to a smaller Context Capsule when the device is resource constrained

Future hot cache design may use:
- pinned user profile facts
- active project summaries
- recently used entities
- recent decisions
- selected workflow/skill cards
- rebuildable keyword or vector cache

## Layers

1. Raw Event Log
2. Canonical Chunks
3. Memory Candidates
4. Hermes Personalization Filter
5. Approval Queue
6. Ghost Tree Source Records
7. Entities
8. Relationships
9. Temporal Memory
10. Hierarchical Summaries
11. Context Capsules
12. Mobile Snapshot
13. Derived Search/Vector Caches

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
- Provider Account Bridge responses can create Ghost Tree memory proposals only.
- Provider-derived memory proposals require explicit user approval before any Ghost Tree write.
- Raw chat/docs should not be retained forever by default.
- Rejected memory candidates should be deleted or retained only as an auditable rejection record according to retention policy.
- Context Capsule Builder injects only approved and relevant memory by default.
- No AgentScope implementation is authorized by the memory engine architecture.

## Implementation Order

Memory implementation remains after Local Brain runtime proof.

Recommended order:

1. Context Capsule Builder ADR
2. Ghost Tree Memory Engine ADR
3. Memory event and chunk contracts
4. Hermes personalization contract
5. Fast memory injection and hot cache design
6. Memory retention and pruning policy
7. Phone/laptop memory sync policy
8. Cyro Agent Harness ADR
9. AgentScope evaluation

AgentScope is deferred until Cyro Agent Harness boundaries are defined.
