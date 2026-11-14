#!/usr/bin/env zsh
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Bootstrapping Field Shift Uzbekistan (NASA Space Apps 2026)..."

# 1. Backend Setup
cd "$ROOT_DIR/backend"
if [ ! -d ".venv" ]; then
  if command -v uv >/dev/null 2>&1; then
    uv venv --seed .venv
  else
    python3 -m venv .venv
  fi
fi
source .venv/bin/activate
pip install --upgrade pip -q 2>/dev/null || true
pip install -r requirements.txt -q

# 2. Frontend Setup
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  npm install
fi

# 3. Concurrent Launch with clean Ctrl+C trap
trap 'kill 0' SIGINT SIGTERM EXIT

echo "🛰️  Starting FastAPI Backend on http://localhost:8000 ..."
(cd "$ROOT_DIR/backend" && source .venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload) &

echo "🌾 Starting Next.js Frontend on http://localhost:3000 ..."
(cd "$ROOT_DIR/frontend" && npm run dev) &

wait
