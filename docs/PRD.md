# Product Requirements Document (PRD)

## AI Model Test Bench

**Version:** 1.0
**Author:** mevarkari
**Date:** 2026-02-07
**Status:** Draft

---

## 1. Overview

### 1.1 Purpose

AI Model Test Bench is a self-hosted web application for systematically testing, benchmarking, and ranking locally-run AI models (primarily GGUF format). It provides a controlled environment to stress-test models with configurable parameters (system prompts, sampling values, context sizes, etc.) and presents results through an intuitive dashboard.

### 1.2 Problem Statement

Testing local GGUF models today is fragmented. Users rely on scattered CLI tools, manual note-taking, and subjective impressions. There is no unified platform to:

- Run structured test suites against multiple models
- Compare outputs side-by-side under identical conditions
- Track performance metrics (speed, memory, quality) over time
- Rank models objectively with reproducible benchmarks

### 1.3 Target Users

- AI hobbyists and researchers running models locally
- Developers evaluating models for integration into products
- Hardware enthusiasts benchmarking models across different machines

---

## 2. Goals and Non-Goals

### 2.1 Goals

| # | Goal |
|---|------|
| G1 | Load and run GGUF models locally via llama.cpp backend |
| G2 | Provide a web UI for configuring test parameters and viewing results |
| G3 | Execute structured test suites with reproducible configurations |
| G4 | Capture quantitative metrics (tokens/sec, time-to-first-token, memory usage, perplexity) |
| G5 | Capture qualitative scores (coherence, instruction-following, factual accuracy) via automated grading |
| G6 | Present a ranked dashboard summarizing all tested models |
| G7 | Allow export of results (CSV, JSON) for external analysis |

### 2.2 Non-Goals (v1)

- Cloud-hosted model inference (this is a local-first tool)
- Fine-tuning or training models
- Supporting non-GGUF formats (ONNX, SafeTensors) — future scope
- Multi-user authentication / team features

---

## 3. Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Web UI)                   │
│  ┌───────────┐ ┌────────────┐ ┌───────────────────┐ │
│  │ Dashboard  │ │ Test Runner│ │ Model Management  │ │
│  └───────────┘ └────────────┘ └───────────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │  REST / WebSocket
┌──────────────────────┴──────────────────────────────┐
│                  Backend (Python / FastAPI)           │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────┐ │
│  │ API Layer  │ │ Test Engine│ │ Scoring Engine    │ │
│  └────────────┘ └────────────┘ └──────────────────┘ │
│  ┌────────────┐ ┌────────────┐                       │
│  │ Model Mgr  │ │ DB (SQLite)│                       │
│  └────────────┘ └────────────┘                       │
└──────────────────────┬──────────────────────────────┘
                       │  Bindings / Subprocess
┌──────────────────────┴──────────────────────────────┐
│            Inference Runtime (llama.cpp)              │
│         llama-cpp-python  /  llama-server             │
└─────────────────────────────────────────────────────┘
```

### 3.2 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + TypeScript + Tailwind CSS + shadcn/ui | Modern, component-driven UI with excellent charting support |
| Charts | Recharts or Chart.js | Lightweight, React-native charting |
| Backend | Python 3.11+ / FastAPI | Async support, ecosystem compatibility with ML tooling |
| Inference | llama-cpp-python (bindings) or llama.cpp server mode | De-facto standard for GGUF inference |
| Database | SQLite (via SQLAlchemy) | Zero-config, file-based, sufficient for single-user |
| Real-time | WebSockets (FastAPI native) | Stream inference output and test progress live |
| Task Queue | Background tasks (FastAPI) / optional Celery | Run long tests without blocking the API |

---

## 4. Core Features

### 4.1 Model Management

**Description:** Import, catalog, and manage GGUF model files.

| Capability | Details |
|-----------|---------|
| Import models | Point to a directory or upload .gguf files |
| Auto-detect metadata | Parse GGUF header for architecture, parameter count, quantization type, context length |
| Model catalog | List all registered models with metadata, file size, date added |
| Model status | Show if a model is currently loaded, idle, or being tested |
| Delete / archive | Remove models from the catalog (optionally delete file) |

### 4.2 Test Configuration

**Description:** Define and save test configurations with full control over inference parameters.

#### 4.2.1 Sampling Parameters

| Parameter | Type | Range / Default | Description |
|-----------|------|----------------|-------------|
| `temperature` | float | 0.0 – 2.0 / 0.7 | Randomness of output |
| `top_p` | float | 0.0 – 1.0 / 0.9 | Nucleus sampling threshold |
| `top_k` | int | 0 – 200 / 40 | Top-K sampling |
| `min_p` | float | 0.0 – 1.0 / 0.05 | Minimum probability threshold |
| `repeat_penalty` | float | 0.0 – 2.0 / 1.1 | Penalize repeated tokens |
| `frequency_penalty` | float | 0.0 – 2.0 / 0.0 | Penalize frequent tokens |
| `presence_penalty` | float | 0.0 – 2.0 / 0.0 | Penalize already-present tokens |
| `mirostat_mode` | int | 0, 1, 2 / 0 | Mirostat sampling mode |
| `mirostat_tau` | float | 0.0 – 10.0 / 5.0 | Mirostat target entropy |
| `mirostat_eta` | float | 0.0 – 1.0 / 0.1 | Mirostat learning rate |

#### 4.2.2 Context & Generation Parameters

| Parameter | Type | Range / Default | Description |
|-----------|------|----------------|-------------|
| `n_ctx` | int | 512 – 131072 / 2048 | Context window size |
| `max_tokens` | int | 1 – 32768 / 512 | Max tokens to generate |
| `n_batch` | int | 1 – 4096 / 512 | Batch size for prompt processing |
| `n_threads` | int | 1 – CPU cores / auto | CPU threads for inference |
| `n_gpu_layers` | int | 0 – 999 / 0 | Layers offloaded to GPU |
| `seed` | int | -1 (random) or fixed | Random seed for reproducibility |

#### 4.2.3 System Prompt Library

- Create, edit, and save reusable system prompts
- Tag system prompts by category (coding, creative, reasoning, instruction-following, roleplay)
- Assign one or more system prompts per test run

#### 4.2.4 Test Presets

- Save parameter combinations as named presets (e.g., "Deterministic", "Creative", "Stress Test")
- Clone and modify existing presets
- Import/export presets as JSON

### 4.3 Test Suites & Prompt Sets

**Description:** Organized collections of prompts that exercise specific model capabilities.

#### 4.3.1 Built-in Test Categories

| Category | Purpose | Example Prompts |
|----------|---------|----------------|
| **Reasoning** | Logic, math, chain-of-thought | "Solve step by step: If a train...", "What comes next in the sequence..." |
| **Instruction Following** | Adherence to constraints | "Write exactly 3 sentences about...", "Respond only in JSON format..." |
| **Coding** | Code generation and debugging | "Write a Python function that...", "Find the bug in this code..." |
| **Creative Writing** | Storytelling, style, coherence | "Write a short story in the style of...", "Continue this narrative..." |
| **Factual Recall** | Knowledge accuracy | "What is the capital of...", "Explain quantum entanglement..." |
| **Safety & Alignment** | Refusal of harmful prompts | "How do I hack into...", "Write something offensive about..." |
| **Long Context** | Handling large input windows | Needle-in-a-haystack tests, long document summarization |
| **Multilingual** | Non-English capability | Translation tasks, non-English QA |

#### 4.3.2 Custom Test Suites

- Users can create custom prompt sets
- Import prompts from CSV/JSON
- Tag and categorize prompts
- Set expected output or grading rubrics per prompt

### 4.4 Test Execution Engine

**Description:** Run tests and capture results with real-time feedback.

| Capability | Details |
|-----------|---------|
| Single-model run | Test one model with one configuration |
| Batch comparison | Test multiple models with the same configuration for comparison |
| Parameter sweep | Test one model across a range of parameter values (e.g., temperature 0.1 to 1.5 in steps) |
| Queue management | Queue multiple test runs, execute sequentially |
| Live streaming | Stream model output to the browser in real-time via WebSocket |
| Cancel / pause | Abort a running test or pause the queue |
| Progress tracking | Show completion %, current prompt, estimated remaining time |
| Auto-retry | Retry failed prompts (e.g., model crash) with configurable retry count |

### 4.5 Metrics & Scoring

#### 4.5.1 Quantitative Metrics (Automatic)

| Metric | Unit | How Captured |
|--------|------|-------------|
| Tokens per second (generation) | tok/s | Timer around generation loop |
| Time to first token (TTFT) | ms | Time from request to first token emitted |
| Prompt eval speed | tok/s | Prompt processing throughput |
| Total generation time | seconds | Wall-clock time for full response |
| Peak RAM usage | MB | System memory sampled during inference |
| Peak VRAM usage | MB | GPU memory (nvidia-smi / rocm-smi) |
| Output token count | int | Token count of generated response |
| Context utilization | % | Tokens used vs. n_ctx |

#### 4.5.2 Qualitative Scoring

| Method | Description |
|--------|-------------|
| Exact match | Compare output to expected answer |
| Contains / regex | Check if output contains expected keywords or patterns |
| LLM-as-judge | Use a reference model to grade responses on a rubric (1-10 scale) |
| Human rating | Manual thumbs up/down or 1-5 star rating via UI |
| Composite score | Weighted average across all scoring methods |

#### 4.5.3 Model Ranking Algorithm

Models are ranked using a weighted composite score:

```
Final Score = (w1 × Quality Score) + (w2 × Speed Score) + (w3 × Efficiency Score)

Where:
  Quality Score   = normalized average of qualitative scores across all test prompts
  Speed Score     = normalized tokens/sec relative to other models tested
  Efficiency Score = normalized inverse of (RAM + VRAM usage)

Default weights: w1=0.5, w2=0.3, w3=0.2 (user-configurable)
```

### 4.6 Dashboard & Visualization

#### 4.6.1 Summary Dashboard

- **Leaderboard table**: All models ranked by composite score with sortable columns
- **Radar chart**: Per-model breakdown across test categories (reasoning, coding, creative, etc.)
- **Performance scatter plot**: Quality vs. Speed, with bubble size = model parameter count
- **Trend line**: Score changes over time if a model is re-tested

#### 4.6.2 Model Detail Page

- Full test history for a single model
- Parameter configuration used for each run
- Individual prompt-level results (expandable)
- Metric distributions (histograms for tok/s, TTFT, etc.)
- Raw output viewer with syntax highlighting

#### 4.6.3 Comparison View

- Side-by-side output comparison for 2–4 models
- Diff view highlighting differences in outputs
- Grouped bar charts for metric comparison
- Win/loss/tie matrix across prompt categories

#### 4.6.4 Parameter Analysis

- Heatmap: Score vs. temperature vs. top_p for a given model
- Line charts: How metrics change across parameter sweeps
- Optimal parameter finder: Highlight the parameter combination that produced the best score

### 4.7 Export & Reporting

| Format | Contents |
|--------|----------|
| CSV | Flat table of all test results |
| JSON | Structured export including configs, prompts, outputs, scores |
| PDF report | Generated summary report with charts (future scope) |
| Clipboard | Copy individual outputs or comparison tables |

---

## 5. Pages & Navigation

### 5.1 Site Map

```
/                         → Dashboard (leaderboard, summary charts)
/models                   → Model catalog (list, import, metadata)
/models/:id               → Model detail (test history, metrics)
/tests                    → Test suite library (browse, create, edit)
/tests/:id                → Test suite detail (prompts, expected outputs)
/run                      → New test run (select model, config, suite)
/run/:id                  → Live test execution (streaming output, progress)
/results                  → All results (filterable, sortable table)
/results/:id              → Single result detail (full outputs, scores)
/compare                  → Model comparison builder
/settings                 → App settings (paths, defaults, weights)
/prompts                  → System prompt library
```

### 5.2 Wireframe Descriptions

#### Dashboard (`/`)
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] AI Model Test Bench          [Settings] [New Test]  │
├──────────┬──────────────────────────────────────────────────┤
│          │  ┌─ Summary Cards ─────────────────────────────┐ │
│  Nav     │  │ Models: 12  │ Tests Run: 47 │ Top: Qwen2.5 │ │
│          │  └─────────────────────────────────────────────┘ │
│ Dashboard│  ┌─ Leaderboard ──────────────────────────────┐ │
│ Models   │  │ # │ Model      │ Score │ Tok/s │ RAM  │ ... │ │
│ Tests    │  │ 1 │ Qwen2.5-7B │  8.7  │ 42.1  │ 5.2G │    │ │
│ Run      │  │ 2 │ Llama3-8B  │  8.3  │ 38.5  │ 5.8G │    │ │
│ Results  │  │ 3 │ Mistral-7B │  8.1  │ 45.2  │ 4.9G │    │ │
│ Compare  │  └─────────────────────────────────────────────┘ │
│ Prompts  │  ┌─ Radar Chart ──┐  ┌─ Scatter Plot ─────────┐ │
│ Settings │  │   (per model)  │  │  Quality vs Speed      │ │
│          │  └────────────────┘  └─────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────┘
```

---

## 6. Data Model

### 6.1 Entity-Relationship Summary

```
Model (1) ──── (N) TestRun
TestRun (1) ──── (1) TestConfig
TestRun (1) ──── (N) TestResult
TestSuite (1) ── (N) TestPrompt
TestRun (N) ──── (1) TestSuite
SystemPrompt (N) ── (N) TestRun
```

### 6.2 Key Tables

#### `models`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | string | Display name |
| file_path | string | Path to .gguf file |
| file_size_bytes | bigint | File size |
| architecture | string | e.g., LlamaForCausalLM |
| parameter_count | string | e.g., "7B", "13B" |
| quantization | string | e.g., Q4_K_M, Q5_K_S |
| context_length | int | Max context from metadata |
| added_at | datetime | When imported |

#### `test_configs`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | string | Preset name |
| temperature | float | Sampling temp |
| top_p | float | Nucleus sampling |
| top_k | int | Top-K |
| min_p | float | Min-P |
| repeat_penalty | float | Repetition penalty |
| n_ctx | int | Context size |
| max_tokens | int | Max generation tokens |
| n_gpu_layers | int | GPU offload layers |
| n_threads | int | CPU threads |
| seed | int | Random seed |
| ... | ... | All other parameters |

#### `test_suites`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | string | Suite name |
| description | string | What it tests |
| category | string | reasoning, coding, etc. |

#### `test_prompts`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| suite_id | UUID | FK → test_suites |
| prompt_text | text | The user prompt |
| expected_output | text | Optional expected answer |
| grading_rubric | text | Scoring criteria |
| order | int | Position in suite |

#### `test_runs`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| model_id | UUID | FK → models |
| config_id | UUID | FK → test_configs |
| suite_id | UUID | FK → test_suites |
| system_prompt_id | UUID | FK → system_prompts (nullable) |
| status | enum | queued, running, completed, failed, cancelled |
| started_at | datetime | Run start time |
| completed_at | datetime | Run end time |
| composite_score | float | Calculated overall score |

#### `test_results`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| run_id | UUID | FK → test_runs |
| prompt_id | UUID | FK → test_prompts |
| output_text | text | Model's generated output |
| tokens_per_sec | float | Generation speed |
| time_to_first_token_ms | float | TTFT |
| prompt_eval_speed | float | Prompt processing speed |
| total_time_sec | float | Wall-clock generation time |
| output_token_count | int | Tokens generated |
| peak_ram_mb | float | Peak memory |
| peak_vram_mb | float | Peak GPU memory |
| quality_score | float | Qualitative score (0-10) |
| scoring_method | string | How quality_score was derived |
| human_rating | int | Optional manual rating (1-5) |

#### `system_prompts`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | string | Display name |
| content | text | System prompt text |
| category | string | Tag / category |
| created_at | datetime | When created |

---

## 7. API Endpoints (Summary)

### Models
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/models | List all models |
| POST | /api/models | Register a new model |
| GET | /api/models/:id | Get model detail + metadata |
| DELETE | /api/models/:id | Remove model from catalog |
| POST | /api/models/scan | Scan a directory for .gguf files |

### Test Configs
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/configs | List all configs/presets |
| POST | /api/configs | Create a new config |
| PUT | /api/configs/:id | Update a config |
| DELETE | /api/configs/:id | Delete a config |

### Test Suites
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/suites | List all test suites |
| POST | /api/suites | Create a suite |
| GET | /api/suites/:id | Get suite with prompts |
| PUT | /api/suites/:id | Update a suite |
| POST | /api/suites/:id/prompts | Add prompts to a suite |
| POST | /api/suites/import | Import prompts from CSV/JSON |

### Test Runs
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/runs | Start a new test run |
| GET | /api/runs | List all runs (filterable) |
| GET | /api/runs/:id | Get run details + results |
| POST | /api/runs/:id/cancel | Cancel a running test |
| WS | /ws/runs/:id | WebSocket for live streaming |

### Results & Rankings
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/results | All results (paginated) |
| GET | /api/results/:id | Single result detail |
| POST | /api/results/:id/rate | Submit human rating |
| GET | /api/rankings | Leaderboard data |
| GET | /api/export/:format | Export results (csv/json) |

### System Prompts
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/prompts | List system prompts |
| POST | /api/prompts | Create a system prompt |
| PUT | /api/prompts/:id | Update a system prompt |
| DELETE | /api/prompts/:id | Delete a system prompt |

---

## 8. User Flows

### 8.1 First-Time Setup
1. User starts the application (`python -m aitestbench` or `docker compose up`)
2. Lands on empty dashboard with "Get Started" prompt
3. Configures model directory path in Settings
4. App scans directory and imports discovered .gguf files
5. Dashboard populates with model catalog

### 8.2 Running a Test
1. User clicks "New Test" button
2. Selects one or more models from catalog
3. Selects or creates a test configuration (sampling params)
4. Optionally selects a system prompt
5. Selects a test suite (built-in or custom)
6. Reviews summary and clicks "Run"
7. Redirected to live execution page showing streaming output
8. On completion, results are scored and stored
9. Dashboard updates with new rankings

### 8.3 Comparing Models
1. User navigates to Compare page
2. Selects 2-4 models to compare
3. Selects a shared test suite / config
4. Views side-by-side outputs, metric bar charts, and win/loss matrix
5. Exports comparison as JSON or CSV

---

## 9. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Startup time | < 5 seconds to serve the web UI |
| Concurrent inference | 1 model at a time (single-user, local machine) |
| Database size | Support 10,000+ test results without degradation |
| Browser support | Chrome, Firefox, Edge (latest 2 versions) |
| Responsive design | Usable on 1280px+ screens (desktop-first) |
| Offline operation | Fully functional without internet after install |
| OS support | Linux (primary), macOS, Windows (WSL) |

---

## 10. Milestones & Phases

### Phase 1 — Foundation (MVP)
- [ ] Project scaffolding (backend + frontend)
- [ ] Model management (import, list, metadata parsing)
- [ ] Basic test configuration UI
- [ ] Single-model test execution with llama-cpp-python
- [ ] Capture quantitative metrics (tok/s, TTFT, RAM)
- [ ] Results storage in SQLite
- [ ] Basic dashboard with leaderboard table

### Phase 2 — Depth
- [ ] System prompt library
- [ ] Test suite builder with custom prompts
- [ ] Built-in test suites (reasoning, coding, creative, etc.)
- [ ] Parameter sweep / batch comparison runs
- [ ] LLM-as-judge scoring
- [ ] Radar charts and scatter plots on dashboard
- [ ] Side-by-side model comparison view

### Phase 3 — Polish
- [ ] Live WebSocket streaming during tests
- [ ] Parameter analysis heatmaps
- [ ] Export to CSV/JSON
- [ ] Test presets (import/export)
- [ ] Queue management with pause/cancel
- [ ] Human rating UI
- [ ] Dark mode / theme support

### Phase 4 — Extend (Future)
- [ ] Support for additional formats (ONNX, SafeTensors)
- [ ] PDF report generation
- [ ] Plugin system for custom scoring methods
- [ ] Multi-GPU and distributed inference support
- [ ] Shareable result links / public leaderboard mode

---

## 11. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Should we support llama.cpp server mode as an alternative to Python bindings? | Open |
| 2 | What reference model should be used for LLM-as-judge scoring? | Open |
| 3 | Should test results be exportable to Hugging Face Open LLM Leaderboard format? | Open |
| 4 | Do we need hardware profiling beyond RAM/VRAM (CPU temp, power draw)? | Open |
| 5 | Should the tool support remote inference servers (e.g., Ollama, vLLM)? | Open |

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| GGUF | GPT-Generated Unified Format — binary format for storing LLM weights, used by llama.cpp |
| llama.cpp | Open-source C++ inference engine for running LLMs locally |
| Quantization | Reducing model precision (e.g., FP16 → Q4_K_M) to decrease file size and memory usage |
| tok/s | Tokens per second — primary speed metric for generation |
| TTFT | Time to first token — latency before the model begins responding |
| Perplexity | Statistical measure of how well a model predicts text; lower = better |
| Mirostat | Adaptive sampling algorithm that targets a specific entropy level |
| n_ctx | Context window size — max number of tokens the model can process at once |
| Top-K / Top-P | Sampling strategies that limit which tokens the model considers for the next prediction |
