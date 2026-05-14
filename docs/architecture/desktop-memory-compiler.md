# Desktop Memory Compiler

## Purpose

Desktop performs heavy memory/index work that should not run constantly on phone.

## Responsibilities

- compress raw events
- extract entities
- resolve relationships
- detect stale/superseded memories
- generate Mobile Snapshot
- later build PageIndex/EvidenceTree
- later run larger local models

## Rules

- no blind DB dump
- compile from append-only events
- emit compact artifacts
- preserve source references
- keep user approval boundary for memory updates
