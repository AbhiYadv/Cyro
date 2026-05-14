# Runtime Resource Policy

## Phone

- Default model: Qwen 0.8B Q4
- Battery fallback: Qwen 0.8B Q3
- Emergency tiny: 2-bit router/redaction only
- Never keep multiple phone models hot
- No background heavy indexing
- No full memory scans on fast path
- Unload after idle or battery pressure

## Desktop

- Heavy compiler
- Larger local models
- PageIndex/EvidenceTree
- vault processing
- sync consolidation

## Fast Path Must Not Require

- VPN startup
- web search
- provider tab loading
- desktop availability
- large model load
