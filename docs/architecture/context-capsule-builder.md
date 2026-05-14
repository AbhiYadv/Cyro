# Context Capsule Builder

## Purpose

A Context Capsule is the small, user-visible context block Cyro adds to a local or provider prompt.

## Inputs

- current prompt
- approved user.md facts
- approved memory.md facts
- entity graph slice
- relationship graph slice
- recent decisions
- Mobile Snapshot

## Outputs

- user-visible preview
- provider target
- included memory ids
- included entity ids
- included relationship ids
- sensitivity label
- approval requirement

## Rules

- Do not include raw vault by default.
- Do not include rejected/pending memory.
- Do not include stale facts if superseded by current facts.
- Show preview before provider use unless user enabled auto-include safe context.
