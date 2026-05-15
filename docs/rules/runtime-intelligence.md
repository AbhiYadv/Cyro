# Runtime Intelligence Rules

## Principle

Cyro selects runtime routes by resource policy and user consent, not by fixed model names or hidden background behavior.

## Required Rules

- Fast, Think, and Pro are routing modes, not hardcoded model names.
- Device capability must be detected or recorded before selecting model size.
- Cyro must not assume every phone can run 3B or larger models.
- Local 0.8B remains the always-available fallback.
- Quantization choice must be benchmark-gated when the model requires benchmark evidence.
- 2-bit is allowed only for router, redaction, emergency fallback, or narrow utility tasks; it is not a main answer model.
- Phone must not keep multiple local models hot.
- High thermal pressure must block heavy local runs.
- Low battery must prefer lighter local fallback or defer.
- User must be able to see why Cyro selected a route.

## Offload Rules

- Laptop offload is future work and requires explicit trusted device pairing.
- Same-Wi-Fi discovery is future work and must not imply permission to offload.
- No prompt may be silently offloaded.
- Local Only must prevent offload.
- Offload must show privacy impact and require approval when prompt content leaves the current device.
- Node failure must not trigger hidden retry loops.

## Blocked In Current Phase

- llama.cpp implementation
- PGLite persistence
- sync transport
- mDNS discovery
- VPN
- provider APIs
- cloud runtime routing
- hidden background model downloads
