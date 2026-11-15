# Contributing to Field Shift UZ

Thank you for your interest in contributing to **Field Shift UZ**! This project was built for the NASA Space Apps Challenge 2026 to fuse satellite data with agronomic principles for Central Asian farm resilience.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js** (v18+) and **pnpm**
- **Python** (v3.10+) with `uv` (recommended) or `pip`
- **Git**

### Quick Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/wlkcsh/nasa-apps-challenge.git
   cd nasa-apps-challenge
   ```

2. **Backend environment:**
   ```bash
   cd backend
   uv venv .venv
   uv pip install -r requirements.txt
   ```

3. **Frontend environment:**
   ```bash
   cd frontend
   pnpm install
   ```

4. **One-Command Launch:**
   ```bash
   ./start.sh
   ```

---

## 🧪 Testing & Code Quality

Before opening a pull request, verify that both backend tests and frontend builds pass cleanly:

### Backend Testing
```bash
cd backend
.venv/bin/pytest -v tests/
```

### Frontend Verification
```bash
cd frontend
pnpm run lint
pnpm run build
```

---

## 📋 Git Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` for new capabilities or user-facing features
- `fix:` for bug fixes
- `perf:` for performance optimizations
- `test:` for adding or updating tests
- `docs:` for documentation updates
- `chore:` for tooling, dependencies, or formatting

---

## 🚀 Pull Request Process

1. Fork the repo and create your feature branch: `git checkout -b feat/my-improvement`.
2. Ensure tests pass locally.
3. Open a Pull Request against `main` with a clear description of your changes.
