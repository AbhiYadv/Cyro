# Agent / AI Rules

## MVP Rule

Do not use AgentScope in MVP. Use deterministic services.

## Allowed Deterministic Services

- RouterService
- ContextCapsuleService
- MemoryCompilerService
- MemoryInspectorService
- EntityExtractionService
- RelationshipService
- TemporalMemoryService
- StaleMemoryService
- MobileSnapshotService
- ImportToMemoryService
- ResourceGovernorService

## Future AgentScope Use

AgentScope may be introduced later only for bounded desktop Deep Mode workflows:
- long document workflows
- evidence pack generation
- database investigation
- multi-step local tasks
- voice workflows

## Agent Restrictions

Agents must never:
- scrape provider tabs
- auto-send prompts
- capture cookies/sessions
- update memory silently
- expose raw vault to cloud
- execute destructive actions without approval
