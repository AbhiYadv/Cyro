# Runtime Resource Policy

## Runtime Intelligence Layer

Runtime resource decisions are owned by the Runtime Intelligence Layer. Fast, Think, and Pro are routing modes, not hardcoded model names.

Before selecting a model or route, Cyro must use a recorded `HardwareProfile`, installed `ModelRegistryEntry` data, benchmark evidence, user settings, battery state, thermal state, and future trusted `NodeAvailability` when available.

Local 0.8B remains the always-available fallback. Cyro must not assume every device can run 3B or larger models.

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

## Runtime Route Safety

- Quantization choice must be benchmark-gated when benchmark evidence is required.
- High thermal state blocks heavy local inference.
- Low battery prefers Q3, 0.8B fallback, or defer.
- Missing benchmark evidence blocks models marked `benchmarkRequired`.
- User-visible route explanation is required for every non-trivial fallback.
- Future laptop offload requires trusted pairing and explicit approval.
- No prompt may be silently offloaded.
