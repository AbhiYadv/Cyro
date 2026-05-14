# Memory Safety Rules

Memory is not chat history.

Rules:
- every memory has source, confidence, sensitivity, status, timestamp
- provider imports create memory candidates only
- user approval required before user.md or memory.md update
- stale/superseded state required
- Context Capsules use approved memory only by default
- raw vault is never included by default
- local compiler controls memory update, not public provider
