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

| Family | Class | Role | Status | Initial Route |
|---|---|---|---|---|
| Qwen | 0.5B | Pipeline proof only | Not production default | none |
| Qwen | 0.8B or nearest small instruct GGUF | Fast local candidate | Evaluate | fast |
| Qwen | 1.5B Q4/IQ | Think candidate for capable phone/laptop | Evaluate | think |
| Qwen | 3B Q4/IQ | Future laptop/Pro candidate | Benchmark-gated later | pro_later |
| MiniCPM | edge-efficient small GGUF | Fast/Think challenger candidate | Evaluate | fast |
| MiniCPM-V | 4.6 GGUF or nearest local multimodal-compatible GGUF | Future multimodal/document candidate | Evaluate later | pro_later |

Candidate policy:
- 0.5B can validate path, subprocess, timeout, and benchmark plumbing only.
- 0.8B or nearest small Qwen instruct GGUF is the first plausible Fast candidate.
- 1.5B Q4/IQ is the first Think candidate after resource and quality gates.
- 3B Q4/IQ is a future laptop or Pro candidate and must remain benchmark-gated.
- MiniCPM and MiniCPM-V are formal challengers to Qwen, not secondary afterthoughts.
- MiniCPM-V 4.6 GGUF availability and `llama.cpp`/Ollama support claims are treated as upstream hypotheses until Cyro validates a user-provided local GGUF through the same benchmark and quality matrix.

## Competitive Ranking Policy

Best measured model becomes primary. Qwen and MiniCPM compete under the same benchmark, quality, resource, and stability gates. Cyro must not select the primary local model by brand preference.

No primary Fast, Think, or future Pro local model is selected until benchmark and quality gates pass. The current Qwen 0.5B proof remains `pipeline_only`.

Weighted score:

| Score component | Weight | Evidence source |
|---|---:|---|
| Quality score | 35 | fixed prompt correctness, hallucination checks, technical accuracy |
| Latency score | 25 | CYRO-0009 local benchmark elapsed time and latency class |
| Instruction-following score | 15 | fixed prompt format compliance and task adherence |
| Resource score | 15 | manual RAM, cold start, battery, and thermal observations |
| Stability score | 10 | repeated runs, nonzero exits, empty-output events, timeout behavior |

Decision outputs:
- `primary_fast_candidate`
- `primary_think_candidate`
- `pro_later_candidate`
- `blocked_quality`
- `blocked_latency`
- `pipeline_only`

Ranking rules:
- A candidate must pass minimum quality thresholds before latency can make it primary.
- A fast but technically wrong model remains `pipeline_only` or `blocked_quality`.
- A high-quality but too-slow model may remain `candidate_pro_later` or `blocked_latency`.
- MiniCPM and Qwen candidate records must use the same prompt set, benchmark policy, and scoring weights.
- Multimodal/document candidates such as MiniCPM-V remain future candidates until Cyro has a document/multimodal evaluation harness.

## Quantization Policy

- `Q4_K_M` remains the baseline candidate for first quality/speed comparisons.
- `IQ4` and `IQ3` variants are advanced compression candidates after the Q4 baseline works.
- `Q2` and `IQ2` are not main answer models; they may be considered only for utility, router, redaction, or emergency fallback work.
- `Q5` and `Q8` are laptop-quality candidates only if benchmark, memory, battery, and thermal gates pass.

No model download, model browser, marketplace, or auto-download behavior is authorized by this evaluation matrix.

## Evaluation Matrix Fields

Every candidate evaluation record must include:
- `modelId`
- `family`
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
- `weightedScore`
- `recommendedRoute`
- `decision`
- `notes`

Allowed `decision` values:
- `pipeline_only`
- `candidate_fast`
- `candidate_think`
- `candidate_pro_later`
- `primary_fast_candidate`
- `primary_think_candidate`
- `pro_later_candidate`
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
- generic questions, writing/email drafting, planning/task breakdown, coding explanation/debugging, technical ops, and Cyro architecture prompts must be represented before promotion
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

| modelId | family | parameterClass | quantization | latencyClass | technicalAccuracyScore | instructionFollowingScore | crispnessScore | weightedScore | recommendedRoute | decision | notes |
|---|---|---|---|---|---:|---:|---:|---:|---|---|---|
| qwen-0_5b-pipeline-proof | Qwen | 0.5B | Q4_K_M | fast | 1 | 2 | 2 | TBD | none | pipeline_only | Fast local runtime proof; blocked as default because technical answer quality failed |
| qwen-0_8b-local-candidate | Qwen | 0.8B | Q4_K_M | TBD | TBD | TBD | TBD | TBD | fast | needs_more_testing | First Qwen Fast candidate to test |
| qwen-1_5b-think-candidate | Qwen | 1.5B | Q4/IQ | TBD | TBD | TBD | TBD | TBD | think | needs_more_testing | Qwen Think candidate for capable phone/laptop |
| qwen-3b-pro-later-candidate | Qwen | 3B | Q4/IQ | TBD | TBD | TBD | TBD | TBD | pro_later | needs_more_testing | Future Qwen laptop/Pro candidate |
| minicpm-fast-think-candidate | MiniCPM | small edge class | Q4/IQ TBD | TBD | TBD | TBD | TBD | TBD | fast | needs_more_testing | MiniCPM challenger; Think route remains possible if benchmark, quality, and resource evidence support it |
| minicpm-v-4_6-document-candidate | MiniCPM-V | multimodal/document class | GGUF TBD | TBD | TBD | TBD | TBD | TBD | pro_later | needs_more_testing | Future document/multimodal candidate; upstream support claims must be locally validated |

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
