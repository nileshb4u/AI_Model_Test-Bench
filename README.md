<p align="center">
  <h1 align="center">AI Model Test Bench</h1>
  <p align="center">
    A self-hosted platform for testing, benchmarking, and ranking local GGUF AI models
    <br />
    <a href="#quick-start"><strong>Get Started</strong></a>
    &nbsp;&middot;&nbsp;
    <a href="#features"><strong>Features</strong></a>
    &nbsp;&middot;&nbsp;
    <a href="#api-documentation"><strong>API Docs</strong></a>
    &nbsp;&middot;&nbsp;
    <a href="docs/PRD.md"><strong>PRD</strong></a>
  </p>
</p>

<p align="center">
  <a href="https://github.com/nileshb4u/AI_Model_Test-Bench/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
  </a>
  <img src="https://img.shields.io/badge/python-3.11%2B-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/fastapi-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/react-18-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/tailwindcss-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/llama.cpp-GGUF-FF6F00" alt="GGUF" />
</p>

---

## What is this?

**AI Model Test Bench** is a local-first web application that lets you systematically push GGUF AI models to their limits. Import your models, configure sampling parameters, run structured test suites, and see ranked results on a dashboard — all from your browser.

No cloud dependencies. No API keys. Everything runs on your machine.

---

## Features

### Model Management
- **Auto-detect metadata** from GGUF binary headers (architecture, quantization, parameter count, context length)
- Scan an entire directory to bulk-import models
- Track model catalog with file size, format, and test history

### Full Parameter Control
Every inference parameter at your fingertips via sliders and inputs:

| Sampling | Context & Generation |
|----------|---------------------|
| Temperature (0 - 2.0) | Context Window (512 - 131072) |
| Top-P / Nucleus (0 - 1.0) | Max Tokens (1 - 32768) |
| Top-K (0 - 200) | Batch Size (1 - 4096) |
| Min-P (0 - 1.0) | CPU Threads |
| Repeat Penalty | GPU Layers (offload) |
| Frequency Penalty | Seed (fixed or random) |
| Presence Penalty | |
| Mirostat (mode, tau, eta) | |

Save configurations as **named presets** and reuse them across runs.

### System Prompt Library
- Create, edit, tag, and organize system prompts by category
- Assign any system prompt to a test run
- Categories: General, Coding, Creative, Reasoning, Instruction Following, Roleplay, Safety

### Test Suites
**6 built-in suites** ship out of the box (26 prompts total):

| Suite | What it tests |
|-------|--------------|
| Reasoning Benchmark | Logic, math, chain-of-thought, trick questions |
| Instruction Following | Format constraints, word counts, exact responses |
| Coding Tasks | Python, SQL, JavaScript, data structures, complexity |
| Creative Writing | Stories, poetry, descriptions, persuasive text |
| Factual Recall | Science, history, general knowledge |
| Safety & Alignment | Ethical reasoning, responsible responses |

Create **custom suites** with your own prompts, expected outputs, and grading rubrics.

### Live Test Execution
- Real-time token streaming via WebSocket
- Progress bar with prompt-level tracking
- Live metrics: tokens/sec, TTFT, RAM usage
- Cancel running tests at any time

### Metrics & Scoring

**Quantitative (automatic):**
| Metric | Unit |
|--------|------|
| Tokens per second | tok/s |
| Time to first token | ms |
| Prompt eval speed | tok/s |
| Total generation time | seconds |
| Peak RAM usage | MB |
| Peak VRAM usage | MB |

**Qualitative:**
- Exact match against expected output
- Keyword / regex pattern matching
- Manual human rating (1-5 stars in the UI)
- Weighted composite scoring

### Ranked Dashboard
- **Leaderboard table** — all models ranked by composite score
- **Radar charts** — per-model category breakdown
- **Scatter plot** — quality vs. speed at a glance
- **Model comparison** — side-by-side outputs, grouped bar charts, win/loss/tie matrix

### Export
- CSV and JSON export for all test results
- Filterable by model, suite, date range

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript | UI framework |
| Styling | Tailwind CSS 3.4 | Dark-themed dashboard |
| Charts | Recharts | Radar, scatter, bar, gauge |
| Icons | Lucide React | Consistent iconography |
| Backend | FastAPI (Python 3.11+) | Async REST API + WebSocket |
| ORM | SQLAlchemy 2.0 (async) | Database layer |
| Database | SQLite + aiosqlite | Zero-config persistence |
| Inference | llama-cpp-python 0.3.8 | GGUF model execution |
| Metrics | psutil | RAM / system monitoring |
| Bundler | Vite 6 | Frontend dev server + build |

---

## Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- (Optional) NVIDIA GPU with CUDA drivers for GPU-accelerated inference

### Option A: Local Development

**1. Clone the repository**

```bash
git clone https://github.com/nileshb4u/AI_Model_Test-Bench.git
cd AI_Model_Test-Bench
```

**2. Start the backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

> Backend runs at **http://localhost:8000**
> API docs at **http://localhost:8000/docs**

**3. Start the frontend** (in a new terminal)

```bash
cd frontend
npm install
npm run dev
```

> Frontend runs at **http://localhost:5173**

**4. Or use the one-liner**

```bash
chmod +x start.sh
./start.sh
```

This launches both backend and frontend in a single terminal.

### Option B: Docker Compose

```bash
# Point to your GGUF models folder
export MODELS_DIR=/path/to/your/gguf/models

docker compose up
```

> Frontend: **http://localhost:5173** | Backend: **http://localhost:8000**

---

## Usage

### 1. Import Models

- Navigate to **Models** in the sidebar
- Click **Scan Directory** and enter the path to your `.gguf` files
- The app auto-detects architecture, quantization type, parameter count, and context length from each file's GGUF header
- Models appear in the catalog immediately

### 2. Configure a Test

- Go to **Run Test**
- **Select a model** (or multiple models for batch comparison)
- **Choose a configuration preset** or build a custom one with the parameter sliders
- **Optionally pick a system prompt** from the library
- **Select a test suite** (built-in or custom)
- Review the summary and click **Run**

### 3. Watch Live Output

- The execution page shows real-time token streaming
- Monitor tokens/sec, TTFT, and memory usage as the test runs
- Each prompt in the suite is tested sequentially with a progress bar

### 4. Analyze Results

- **Dashboard** shows the leaderboard with all tested models ranked
- Click any model to see detailed test history and metric distributions
- Use **Compare** to put 2-4 models side by side with charts and a win/loss matrix
- **Export** results as CSV or JSON for external analysis

### 5. Rate Outputs

- In the **Results** page, click the star icon on any result to submit a 1-5 human rating
- Human ratings feed into the composite quality score

---

## Configuration

### Environment Variables

All backend settings can be overridden with environment variables (prefix: `ATB_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `ATB_DATABASE_URL` | `sqlite+aiosqlite:///./aitestbench.db` | Database connection string |
| `ATB_MODELS_DIRECTORY` | `./models` | Default path to scan for .gguf files |
| `ATB_DEFAULT_N_THREADS` | `4` | Default CPU thread count |
| `ATB_DEFAULT_N_GPU_LAYERS` | `0` | Default GPU layers (0 = CPU only) |
| `ATB_SCORING_WEIGHT_QUALITY` | `0.5` | Weight for quality in composite score |
| `ATB_SCORING_WEIGHT_SPEED` | `0.3` | Weight for speed in composite score |
| `ATB_SCORING_WEIGHT_EFFICIENCY` | `0.2` | Weight for memory efficiency |

### Scoring Weights

The composite ranking score is computed as:

```
Composite = (w1 x Quality) + (w2 x Speed) + (w3 x Efficiency)
```

- **Quality** (0-10): Average qualitative score across all test prompts
- **Speed** (0-10): Normalized tokens/sec relative to other tested models
- **Efficiency** (0-10): Normalized inverse of peak memory usage

Weights are adjustable in the **Settings** page or via environment variables. They are automatically normalized to sum to 1.0.

---

## API Documentation

Once the backend is running, full interactive API docs are available:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/stats` | App statistics (model/run/result counts) |
| `GET` | `/api/models` | List all models |
| `POST` | `/api/models` | Register a model |
| `POST` | `/api/models/scan` | Scan directory for .gguf files |
| `GET` | `/api/configs` | List test configurations |
| `POST` | `/api/configs` | Create a configuration preset |
| `GET` | `/api/suites` | List test suites |
| `POST` | `/api/suites` | Create a test suite with prompts |
| `POST` | `/api/runs` | Start a test run |
| `POST` | `/api/runs/batch` | Start batch comparison (multiple models) |
| `GET` | `/api/rankings` | Get ranked leaderboard |
| `GET` | `/api/rankings/compare` | Compare specific models |
| `GET` | `/api/export/csv` | Export results as CSV |
| `GET` | `/api/export/json` | Export results as JSON |
| `WS` | `/ws/runs/{run_id}` | WebSocket for live streaming |

---

## Project Structure

```
AI_Model_Test-Bench/
├── backend/                          # Python / FastAPI
│   ├── app/
│   │   ├── main.py                   # App entry, startup, seed data
│   │   ├── config.py                 # Pydantic settings (env vars)
│   │   ├── database.py               # Async SQLAlchemy engine + session
│   │   ├── models/                   # 7 SQLAlchemy ORM models
│   │   │   ├── model.py              #   AI model catalog
│   │   │   ├── test_config.py        #   Sampling parameter presets
│   │   │   ├── system_prompt.py      #   System prompt library
│   │   │   ├── test_suite.py         #   Test suite definitions
│   │   │   ├── test_prompt.py        #   Individual test prompts
│   │   │   ├── test_run.py           #   Test execution records
│   │   │   └── test_result.py        #   Per-prompt results + metrics
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── routers/                  # 7 API routers (25+ endpoints)
│   │   │   ├── models.py             #   /api/models
│   │   │   ├── configs.py            #   /api/configs
│   │   │   ├── prompts.py            #   /api/prompts
│   │   │   ├── suites.py             #   /api/suites
│   │   │   ├── runs.py               #   /api/runs
│   │   │   ├── results.py            #   /api/results + /api/export
│   │   │   └── rankings.py           #   /api/rankings
│   │   ├── services/
│   │   │   ├── gguf_parser.py        #   Binary GGUF header reader
│   │   │   ├── inference.py          #   llama-cpp-python wrapper
│   │   │   ├── scoring.py            #   Quality + composite scoring
│   │   │   └── metrics.py            #   RAM/VRAM/timing collector
│   │   └── websocket/
│   │       └── stream.py             #   WebSocket broadcast handler
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile
│   └── run.py                        # Uvicorn launcher
│
├── frontend/                         # React / TypeScript
│   ├── src/
│   │   ├── App.tsx                   # Router + route definitions
│   │   ├── main.tsx                  # React entry point
│   │   ├── index.css                 # Tailwind + global styles
│   │   ├── api/
│   │   │   ├── client.ts             # Typed fetch wrapper
│   │   │   └── index.ts              # All API endpoint functions
│   │   ├── components/
│   │   │   ├── ui/                   # 11 reusable components
│   │   │   ├── charts/               # 4 Recharts visualizations
│   │   │   └── layout/               # Sidebar, Header, Layout
│   │   ├── pages/                    # 11 route pages
│   │   │   ├── Dashboard.tsx         #   Leaderboard + charts
│   │   │   ├── Models.tsx            #   Model catalog
│   │   │   ├── ModelDetail.tsx       #   Single model deep-dive
│   │   │   ├── TestSuites.tsx        #   Suite library
│   │   │   ├── TestSuiteDetail.tsx   #   Suite + prompt editor
│   │   │   ├── RunTest.tsx           #   Test config (all params)
│   │   │   ├── TestExecution.tsx     #   Live streaming output
│   │   │   ├── Results.tsx           #   Filterable results table
│   │   │   ├── Compare.tsx           #   Side-by-side comparison
│   │   │   ├── Prompts.tsx           #   System prompt manager
│   │   │   └── Settings.tsx          #   App configuration
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts       # WebSocket connection hook
│   │   ├── types/
│   │   │   └── index.ts              # All TypeScript interfaces
│   │   └── utils/
│   │       └── format.ts             # Formatting helpers
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── index.html
│
├── docs/
│   └── PRD.md                        # Full Product Requirements Doc
├── docker-compose.yml                # One-command deployment
├── start.sh                          # Dev startup script
├── .gitignore
├── LICENSE                           # MIT
└── README.md
```

---

## Dependencies

### Backend (`backend/requirements.txt`)

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.115.6 | Async web framework |
| uvicorn[standard] | 0.34.0 | ASGI server |
| sqlalchemy | 2.0.36 | Async ORM |
| aiosqlite | 0.20.0 | Async SQLite driver |
| pydantic | 2.10.3 | Data validation |
| pydantic-settings | 2.7.0 | Environment-based config |
| llama-cpp-python | 0.3.8 | GGUF model inference |
| psutil | 6.1.1 | System resource monitoring |
| python-multipart | 0.0.20 | File upload support |
| websockets | 14.1 | WebSocket protocol |

### Frontend (`frontend/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.3.1 | UI framework |
| react-dom | 18.3.1 | DOM renderer |
| react-router-dom | 6.28.0 | Client-side routing |
| recharts | 2.15.0 | Charts and visualizations |
| lucide-react | 0.460.0 | Icon library |
| clsx | 2.1.1 | Conditional class names |
| tailwind-merge | 2.6.0 | Tailwind class merging |
| tailwindcss | 3.4.16 | Utility-first CSS |
| typescript | 5.7.2 | Type safety |
| vite | 6.0.3 | Build tool + dev server |

---

## Hardware Acceleration

### NVIDIA GPU (CUDA)

```bash
CMAKE_ARGS="-DGGML_CUDA=on" pip install llama-cpp-python --force-reinstall --no-cache-dir
```

Set `n_gpu_layers` > 0 in your test configuration to offload layers to the GPU.

### AMD GPU (ROCm)

```bash
CMAKE_ARGS="-DGGML_HIPBLAS=on" pip install llama-cpp-python --force-reinstall --no-cache-dir
```

### Apple Silicon (Metal)

```bash
CMAKE_ARGS="-DGGML_METAL=on" pip install llama-cpp-python --force-reinstall --no-cache-dir
```

### Qualcomm Snapdragon NPU

AI Model Test Bench has first-class support for **Qualcomm Snapdragon NPUs** via the **QNN (Qualcomm Neural Network) SDK**. This enables inference acceleration on the **Hexagon Tensor Processor (HTP)** found in:

- **Snapdragon X Elite / X Plus** (laptops — Copilot+ PCs)
- **Snapdragon 8 Gen 3 / 8 Gen 2** (mobile)
- **Snapdragon 7+ Gen 2** (mobile)

#### Prerequisites

1. **Qualcomm QNN SDK** — Download from the [Qualcomm AI Engine Direct SDK](https://www.qualcomm.com/developer/software/qualcomm-ai-engine-direct-sdk) page
2. **Snapdragon device** with NPU hardware (Windows on ARM or Linux ARM64)

#### Setup

**Step 1: Install the QNN SDK**

```bash
# Set the SDK path after installation
export QNN_SDK_ROOT=/path/to/qnn-sdk

# Add libraries to path
export LD_LIBRARY_PATH=$QNN_SDK_ROOT/lib/aarch64-linux-gnu:$LD_LIBRARY_PATH   # Linux ARM64
# or for Windows: add %QNN_SDK_ROOT%\lib\aarch64-windows-msvc to PATH
```

**Step 2: Build llama-cpp-python with QNN support**

```bash
CMAKE_ARGS="-DGGML_QNN=on" pip install llama-cpp-python --force-reinstall --no-cache-dir
```

> On Windows ARM64, you may need Visual Studio 2022 with ARM64 build tools:
> ```bash
> set CMAKE_ARGS=-DGGML_QNN=on
> pip install llama-cpp-python --force-reinstall --no-cache-dir
> ```

**Step 3: Configure in the app**

- Go to **Run Test** > **Custom Configuration** > **NPU Acceleration**
- Toggle **Enable NPU Offloading** on
- Select **Qualcomm QNN (Snapdragon HTP)** as the backend
- The inference engine will route computation to the Hexagon NPU

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ATB_DEFAULT_NPU_ENABLED` | `false` | Enable NPU by default for new configs |
| `ATB_DEFAULT_NPU_DEVICE` | `""` | NPU device type (`"qnn"` for Snapdragon) |
| `ATB_QNN_SDK_PATH` | `""` | Path to Qualcomm QNN SDK installation |
| `QNN_SDK_ROOT` | — | Standard QNN SDK env var (used by llama.cpp) |

#### Auto-Detection

The app automatically detects Snapdragon NPU hardware via:
- **Linux**: `/sys/class/misc/adsprpc-smd`, `/sys/devices/platform/soc/soc:qcom,npu`, `lscpu`
- **Windows**: `wmic cpu get name`, QNN driver DLLs (`QnnHtp.dll`, `QnnSystem.dll`)
- **QNN SDK**: `QNN_SDK_ROOT` environment variable

Check detection status at: `GET /api/system/accelerators`

```json
{
  "gpu": { "available": false, "type": null },
  "npu": {
    "available": true,
    "device": "qnn",
    "name": "Snapdragon NPU",
    "soc": "Snapdragon X Elite",
    "htp_available": true
  }
}
```

#### QNN Device Targets

| Target | Description | Use Case |
|--------|-----------|----------|
| QNN HTP | Hexagon Tensor Processor (NPU) | Best for LLM inference — highest TOPS |
| QNN GPU | Adreno GPU via QNN | Fallback if HTP doesn't support the model |
| QNN CPU | CPU via QNN runtime | Debugging / baseline comparison |

#### Performance Notes

- Snapdragon X Elite HTP delivers up to **45 TOPS** of AI compute
- Best performance with **Q4_0** and **Q4_K_M** quantized models
- NPU uses shared system memory (unified architecture) — no separate VRAM
- The app tracks NPU memory via Qualcomm's fastrpc debug interface where available
- Combine `n_gpu_layers` with NPU for hybrid GPU+NPU execution on supported platforms

---

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create a branch** for your feature (`git checkout -b feature/my-feature`)
3. **Make your changes** and ensure the backend starts cleanly
4. **Commit** with a descriptive message
5. **Push** and open a **Pull Request**

### Areas for Contribution

- Additional built-in test suites
- New chart types and dashboard widgets
- LLM-as-judge scoring integration
- Support for additional model formats (ONNX, SafeTensors)
- PDF report generation
- Internationalization (i18n)

---

## Roadmap

- [ ] LLM-as-judge automated scoring (use a reference model to grade outputs)
- [ ] Parameter sweep mode (auto-test across a range of values)
- [ ] PDF report generation with charts
- [ ] Support for Ollama / vLLM remote backends
- [ ] Plugin system for custom scoring methods
- [ ] ONNX and SafeTensors format support
- [ ] Shareable public leaderboard mode
- [ ] Hardware profiling (CPU temperature, power draw)

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with FastAPI, React, and llama-cpp-python
  <br />
  <sub>Created by <a href="https://github.com/nileshb4u">nileshb4u</a></sub>
</p>
