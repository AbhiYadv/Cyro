# Local Model Candidate Evaluation Matrix

## Purpose

CYRO-0010 defines how Cyro evaluates local GGUF model candidates before they become defaults for Fast, Think, or future Pro routes.

Speed alone is not enough. A model must pass both benchmark and quality gates before Runtime Intelligence can treat it as a candidate route.

The current `qwen2.5-0.5b-instruct-q4_k_m.gguf` result is pipeline proof only. It proved that the Rust-supervised `llama-cli` path can run locally, but it did not pass technical answer quality. It must not become the production default local brain.

## Current Observation

Observed test model:
- `modelId`: `qwen-0_5b-pipeline-proof`
- `fileName`: `qwen2.5-0.5b-instruct-q4_k_m.gguf`
- `parameterClass`: `0.5B`
- `quantization`: `Q4_K_M`
- `benchmarkElapsedMs`: `1640`
- `latencyClass`: `fast`
- `tokenEstimate`: `18.9 token-ish/sec`
- `qualityResult`: not acceptable for technical correctness
- `decision`: `pipeline_only`

The model answered quickly, but incorrectly explained PostgreSQL PITR. PITR must be expanded as Point-in-Time Recovery and described in terms of backups plus WAL/archive logs or restoring to a specific time. A fast benchmark result does not imply answer quality is acceptable.

## Candidate Ladder

| Class | Role | Status | Initial Route |
|---|---|---|---|
| 0.5B | Pipeline proof only | Not production default | none |
| 0.8B or nearest small Qwen instruct GGUF | Fast local candidate | Evaluate | fast |
| 1.5B Q4/IQ | Think candidate for capable phone/laptop | Evaluate | think |
| 3B Q4/IQ | Future laptop/Pro candidate | Benchmark-gated later | pro_later |

Candidate policy:
- 0.5B can validate path, subprocess, timeout, and benchmark plumbing only.
- 0.8B or nearest small Qwen instruct GGUF is the first plausible Fast candidate.
- 1.5B Q4/IQ is the first Think candidate after resource and quality gates.
- 3B Q4/IQ is a future laptop or Pro candidate and must remain benchmark-gated.

## Quantization Policy

- `Q4_K_M` remains the baseline candidate for first quality/speed comparisons.
- `IQ4` and `IQ3` variants are advanced compression candidates after the Q4 baseline works.
- `Q2` and `IQ2` are not main answer models; they may be considered only for utility, router, redaction, or emergency fallback work.
- `Q5` and `Q8` are laptop-quality candidates only if benchmark, memory, battery, and thermal gates pass.

No model download, model browser, marketplace, or auto-download behavior is authorized by this evaluation matrix.

## Evaluation Matrix Fields

Every candidate evaluation record must include:
- `modelId`
- `fileName`
- `parameterClass`
- `quantization`
- `fileSizeMb`
- `configuredPath`
- `benchmarkElapsedMs`
- `latencyClass`
- `tokenEstimate`
- `coldStartObservation`
- `memoryObservationManual`
- `technicalAccuracyScore`
- `instructionFollowingScore`
- `crispnessScore`
- `recommendedRoute`
- `decision`
- `notes`

Allowed `decision` values:
- `pipeline_only`
- `candidate_fast`
- `candidate_think`
- `candidate_pro_later`
- `blocked_quality`
- `blocked_latency`
- `needs_more_testing`

Allowed `recommendedRoute` values:
- `none`
- `fast`
- `think`
- `pro_later`

## Gate Policy

Fast/Think/Pro require benchmark and quality evidence before Runtime Intelligence can select a model as a candidate route.

Benchmark gate:
- sidecar path must be validated by Rust
- model path must be validated by Rust
- benchmark must run locally
- elapsed time and latency class must be recorded
- result must remain local unless a future task explicitly adds local persistence

Quality gate:
- technical accuracy must be tested with fixed prompts
- instruction following must be tested with fixed prompts
- crispness must be tested with fixed prompts
- failures must block default-route selection even when latency is fast
- no broad quality claims are allowed until candidates are tested

Runtime Intelligence should treat missing quality evidence the same way it treats missing required benchmark evidence: a route can remain visible as a test candidate, but it cannot become the default production local brain.

## Quality Evaluation Prompts

### postgres_pitr

Prompt:

```text
Answer in exactly 3 bullets: what is PostgreSQL PITR?
```

Expected quality:
- must expand PITR as Point-in-Time Recovery
- must mention WAL/archive logs/backups or restoring to a specific time
- must not invent "Projections by Table" or performance testing

### mysql_replica_lag

Prompt:

```text
Primary MySQL is down and replica is 8 seconds behind. What is the safest failover decision in 4 bullets?
```

Expected quality:
- must mention data loss/RPO risk
- must avoid blindly promoting without a business decision
- must mention checking replication state, binlog position, or consistency

### cyro_architecture

Prompt:

```text
In 5 bullets, explain Cyro's local sidecar runtime boundary.
```

Expected quality:
- must mention Rust/Tauri owns sidecar execution
- must mention React does not execute binaries
- must mention no cloud/provider call
- must mention local GGUF path validation

### concise_instruction

Prompt:

```text
Give me only the next 3 implementation tasks for Cyro Local Brain. No explanation.
```

Expected quality:
- must return only 3 tasks
- must not write an essay
- must stay relevant to Local Brain

## Matrix Template

| modelId | parameterClass | quantization | latencyClass | technicalAccuracyScore | instructionFollowingScore | crispnessScore | recommendedRoute | decision | notes |
|---|---|---|---|---:|---:|---:|---|---|---|
| qwen-0_5b-pipeline-proof | 0.5B | Q4_K_M | fast | 1 | 2 | 2 | none | pipeline_only | Fast local runtime proof; blocked as default because technical answer quality failed |
| qwen-0_8b-local-candidate | 0.8B | Q4_K_M | TBD | TBD | TBD | TBD | fast | needs_more_testing | First Fast candidate to test |
| qwen-1_5b-think-candidate | 1.5B | Q4/IQ | TBD | TBD | TBD | TBD | think | needs_more_testing | Think candidate for capable phone/laptop |
| qwen-3b-pro-later-candidate | 3B | Q4/IQ | TBD | TBD | TBD | TBD | pro_later | needs_more_testing | Future laptop/Pro candidate |

## Non-Goals

CYRO-0010 does not add:
- model downloads
- model files
- sidecar binaries
- automatic Hugging Face integration
- model marketplace or browser
- runtime model switching
- benchmark persistence
- LLM-as-judge quality scoring
- cloud evaluation
- streaming
- UX redesign
