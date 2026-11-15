# Post-Hackathon Repository Healing & Stabilization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Field Shift UZ (NASA Space Apps Challenge 2026) repository from a rapid hackathon sprint into a clean, reproducible, self-contained, tested, production-grade monorepo.

**Architecture:** Vendor the scientific agronomic engine `fieldshift` and its offline `demo_cache` directly into `backend/`, eliminating fragile external path couplings. Add comprehensive automated FastAPI tests with pytest, reorganize root presentation and prototype assets into dedicated directories, harmonize frontend package management on pnpm, and modernize `start.sh` with uv.

**Tech Stack:** Python 3.10+, FastAPI, Pydantic, Pandas, NumPy, Pytest, Next.js 14, React Three Fiber, Tailwind CSS, pnpm, uv.

---

## Global Constraints
- Python: Default to `uv` for package and venv management, maintaining pip compatibility via pinned `requirements.txt`.
- Frontend: Use `pnpm` exclusively as defined in `pnpm-lock.yaml`; eliminate `package-lock.json`.
- Offline First: Pinned demo coordinates (Fergana Valley, Central Kansas, Karakalpakstan, Bukhara, Samarkand) must work with zero external network access via `demo_cache`.
- Self-Contained: `backend` must have zero runtime or import dependency on `NASA_Space_App_Challenge`.

---

## Review Focus
1. **Clean Clone Portability**: A fresh `git clone` without `NASA_Space_App_Challenge` must start and pass tests without `ModuleNotFoundError`.
2. **Demo Offline Cache**: Fergana analysis must resolve instantly using local `demo_cache` rather than timing out on NASA POWER or SoilGrids APIs.
3. **Presentation Asset Integrity**: PPTX files and generation scripts moved to `presentation/` must open cleanly without path errors.
4. **API Contract Compatibility**: Next.js frontend calls to `/api/analyze-field`, `/api/presets`, `/api/crops`, `/api/gibs-layers` must remain 100% contract-compliant.
5. **Concurrent Start**: `start.sh` must reliably launch both backend (port 8000) and frontend (port 3000) and cleanly terminate both on Ctrl+C.

---

### Task 1: Vendor Scientific Engine & Offline Demo Cache into Backend

**Files:**
- Create: `backend/fieldshift/` (full package contents from `NASA_Space_App_Challenge/src/fieldshift`)
- Create: `backend/data/demo_cache/` (pre-cached datasets from `NASA_Space_App_Challenge/data/demo_cache`)
- Modify: `backend/fieldshift/config.py`
- Modify: `backend/main.py:10-18`

**Interfaces:**
- Consumes: `NASA_Space_App_Challenge/src/fieldshift`, `NASA_Space_App_Challenge/data/demo_cache`
- Produces: `backend.fieldshift` native package, self-contained `backend.data.demo_cache`

- [ ] **Step 1: Copy `fieldshift` package to `backend/fieldshift/`**
- [ ] **Step 2: Copy `demo_cache` to `backend/data/demo_cache/`**
- [ ] **Step 3: Update `backend/fieldshift/config.py` path resolution to reference `backend/`**
- [ ] **Step 4: Remove `FIELDSHIFT_SRC` and `sys.path.insert` from `backend/main.py`**
- [ ] **Step 5: Verify backend imports cleanly without external path coupling**
  Run: `backend/.venv/bin/python -c "import sys; sys.path.insert(0, 'backend'); import main; print('Self-contained import OK!')"`

---

### Task 2: Complete Backend Dependencies, Packaging & Automated Test Suite

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/pyproject.toml`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: `backend.main.app`, `fastapi.testclient.TestClient`
- Produces: Automated pytest test suite for all API routes

- [ ] **Step 1: Write failing/initial test suite in `backend/tests/test_api.py`**
  Covering `/api/presets`, `/api/crops`, `/api/gibs-layers`, `/api/analyze-field` (valid + validation error).
- [ ] **Step 2: Update `backend/requirements.txt` and `backend/pyproject.toml` with complete dependencies**
  Including `python-dotenv`, `pandas`, `requests`, `numpy`, `pytest`, `pytest-asyncio`.
- [ ] **Step 3: Install updated dependencies in backend virtual environment**
  Run: `cd backend && uv pip install -r requirements.txt || .venv/bin/pip install -r requirements.txt`
- [ ] **Step 4: Run pytest to verify all tests pass**
  Run: `cd backend && .venv/bin/pytest -v tests/`
  Expected: 5+ tests pass with 100% green.

---

### Task 3: Harmonize Frontend Package Management & Tooling

**Files:**
- Delete: `frontend/package-lock.json`
- Modify: `frontend/package.json`
- Modify: `start.sh`

**Interfaces:**
- Consumes: `frontend/pnpm-lock.yaml`
- Produces: `pnpm` single source of truth, modernized `start.sh`

- [ ] **Step 1: Delete `frontend/package-lock.json`**
- [ ] **Step 2: Add `"lint": "next lint"` script to `frontend/package.json`**
- [ ] **Step 3: Update `start.sh` to use `uv` and `pnpm` with robust fallback**
- [ ] **Step 4: Test frontend build using pnpm**
  Run: `cd frontend && pnpm run build`
  Expected: Clean build with exit code 0.

---

### Task 4: Reorganize Root Clutter & Clean .gitignore

**Files:**
- Create: `presentation/`
- Create: `prototypes/`
- Move: `*.pptx`, `apply_animations.py`, `build_agriverto_deck.py` -> `presentation/`
- Move: `*.html` (except index in frontend), `fergana_ndvi_canva_ready.png` -> `prototypes/`
- Move: `Scroll-Driven Rocket Intro Design Notes.md` -> `docs/`
- Delete: Root orphan `node_modules/`
- Modify: `.gitignore`
- Modify: `README.md`

- [ ] **Step 1: Create `presentation/` and `prototypes/` directories**
- [ ] **Step 2: Move pitch presentations and scripts into `presentation/`**
- [ ] **Step 3: Move standalone HTML prototypes into `prototypes/`**
- [ ] **Step 4: Move design notes into `docs/`**
- [ ] **Step 5: Delete root orphan `node_modules/`**
- [ ] **Step 6: Update `.gitignore` to reflect new layout and preserve `backend/data/demo_cache/`**
- [ ] **Step 7: Update `README.md` with accurate architecture and quick-start instructions**
- [ ] **Step 8: Verify git status is clean and all files are properly categorized**
