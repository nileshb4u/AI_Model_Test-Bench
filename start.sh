#!/usr/bin/env bash
set -e

echo "======================================"
echo "  AI Model Test Bench - Starting..."
echo "======================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed."
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Setup backend
echo -e "${BLUE}Setting up backend...${NC}"
cd "$SCRIPT_DIR/backend"

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

echo -e "${GREEN}Starting backend on http://localhost:8000${NC}"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Setup frontend
echo -e "${BLUE}Setting up frontend...${NC}"
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    npm install
fi

echo -e "${GREEN}Starting frontend on http://localhost:5173${NC}"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "======================================"
echo -e "  ${GREEN}AI Model Test Bench is running!${NC}"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "======================================"
echo "Press Ctrl+C to stop."

# Trap Ctrl+C to clean up
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
