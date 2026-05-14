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
- Provider Account Bridge responses create Ghost Tree memory proposals only
- provider-derived Ghost Tree facts require explicit user approval before write
- provider-derived memory must include source, confidence, sensitivity, status, timestamp, and stale/superseded behavior
