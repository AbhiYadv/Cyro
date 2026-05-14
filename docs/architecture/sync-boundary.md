# Sync Boundary

## Principle

Sync events and compact artifacts, not blind full databases.

## Syncable

- MemoryEvent
- MemoryCandidate
- approved memory
- entity/relationship updates
- temporal status updates
- MobileSnapshot
- provider history metadata
- encrypted imported response blobs

## Not Default Sync

- raw vault files
- full DB dump
- full PageIndex
- provider cookies/sessions
- raw cloud history unless user imported it
