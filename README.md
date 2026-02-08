# AI Model Test Bench

A self-hosted web application for systematically testing, benchmarking, and ranking local AI models (GGUF format). Push your models to the limit with configurable system prompts, sampling parameters, and structured test suites — then visualize the results on a ranked dashboard.

## Features

- **Model Management** — Import .gguf files, auto-parse architecture, quantization, and parameter count from GGUF headers
- **Full Parameter Control** — Temperature, Top-K, Top-P, Min-P, Mirostat, repeat/frequency/presence penalties, context size, GPU offloading, and more
- **System Prompt Library** — Create, tag, and reuse system prompts across test runs
- **Test Suites** — Built-in suites (reasoning, coding, creative writing, instruction following, factual recall, safety) plus custom prompt sets
- **Live Execution** — Stream model output in real-time via WebSocket, track progress, cancel anytime
- **Quantitative Metrics** — Tokens/sec, time-to-first-token, prompt eval speed, RAM/VRAM usage
- **Qualitative Scoring** — Exact match, keyword/regex, LLM-as-judge, manual human rating
- **Ranked Dashboard** — Leaderboard with composite scores, radar charts, scatter plots, side-by-side comparison
- **Parameter Sweeps** — Test one model across a range of values to find optimal settings
- **Export** — CSV and JSON export for all results

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Recharts |
| Backend | Python 3.11+ / FastAPI |
| Inference | llama-cpp-python (llama.cpp bindings) |
| Database | SQLite (via SQLAlchemy async) |
| Real-time | WebSockets |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- (Optional) NVIDIA GPU with CUDA for GPU-accelerated inference

### 1. Clone and setup

```bash
git clone https://github.com/nileshb4u/AI_Model_Test-Bench.git
cd AI_Model_Test-Bench
```

### 2. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

The API will be available at `http://localhost:8000`.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The web UI will be available at `http://localhost:5173`.

### 4. (Alternative) Docker Compose

```bash
# Set your models directory
export MODELS_DIR=/path/to/your/gguf/models

docker compose up
```

### 5. Import models

1. Open the web UI
2. Go to **Models** page
3. Click **Scan Directory** and point to your folder of .gguf files
4. Models are imported with auto-detected metadata

### 6. Run your first test

1. Click **Run Test** in the sidebar
2. Select a model, test configuration, and test suite
3. Click **Run** and watch the live output stream
4. View results on the **Dashboard**

## Project Structure

```
AI_Model_Test-Bench/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry
│   │   ├── config.py            # App configuration
│   │   ├── database.py          # SQLAlchemy async setup
│   │   ├── models/              # Database models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # API route handlers
│   │   ├── services/            # Business logic (inference, scoring)
│   │   └── websocket/           # WebSocket streaming
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── api/                 # API client
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/              # Buttons, cards, inputs, modals
│   │   │   ├── charts/          # Recharts visualizations
│   │   │   └── layout/          # Sidebar, header, layout
│   │   ├── pages/               # Route pages
│   │   ├── hooks/               # Custom React hooks
│   │   ├── types/               # TypeScript interfaces
│   │   └── utils/               # Formatting utilities
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   └── PRD.md                   # Product Requirements Document
├── docker-compose.yml
└── README.md
```

## API Documentation

Once the backend is running, interactive API docs are available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Scoring & Ranking

Models are ranked using a weighted composite score:

```
Final Score = (w1 × Quality) + (w2 × Speed) + (w3 × Efficiency)

Default weights: w1=0.5, w2=0.3, w3=0.2 (configurable in Settings)
```

- **Quality**: Average qualitative score across test prompts (0-10)
- **Speed**: Normalized tokens/sec relative to other tested models
- **Efficiency**: Normalized inverse of memory usage

## License

MIT License — see [LICENSE](LICENSE) for details.
