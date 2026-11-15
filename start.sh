#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Bootstrapping Field Shift Uzbekistan (NASA Space Apps 2026)..."

# 1. Backend Setup
cd "$ROOT_DIR/backend"
if command -v uv >/dev/null 2>&1; then
  if [ ! -d ".venv" ]; then
    echo "📦 Creating backend virtual environment with uv..."
    uv venv .venv
  fi
  echo "📥 Installing backend dependencies with uv..."
  uv pip install -r requirements.txt -q
else
  if [ ! -d ".venv" ]; then
    echo "📦 Creating backend virtual environment with python3 -m venv..."
    python3 -m venv .venv
  fi
  source .venv/bin/activate
  pip install --upgrade pip -q 2>/dev/null || true
  pip install -r requirements.txt -q
fi

# 2. Frontend Setup
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install
  else
    npm install
  fi
fi

# 3. Concurrent Launch with clean Ctrl+C trap
trap 'kill 0' SIGINT SIGTERM EXIT

echo "🛰️  Starting FastAPI Backend on http://localhost:8000 ..."
(cd "$ROOT_DIR/backend" && source .venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload) &

echo "🌾 Starting Next.js Frontend on http://localhost:3000 ..."
(cd "$ROOT_DIR/frontend" && if command -v pnpm >/dev/null 2>&1; then pnpm dev; else npm run dev; fi) &

wait
