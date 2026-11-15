# CI/CD, Containerization & Milestone Commit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide automated continuous integration via GitHub Actions, containerize the entire stack with Docker & Docker Compose, and formally stage and commit the healed post-hackathon codebase.

**Architecture:** A unified GitHub Actions workflow running backend pytest and frontend Next.js lint/build in parallel jobs. Production-grade Dockerfiles for FastAPI and Next.js coordinated by `docker-compose.yml`. Clean atomic commit of the healed monorepo.

**Tech Stack:** GitHub Actions, Docker, Docker Compose, FastAPI, Next.js 14, pnpm, uv/pytest.

---

## Global Constraints
- GitHub Actions must use official, maintained actions (`actions/checkout@v4`, `actions/setup-python@v5`, `pnpm/action-setup@v4`, `actions/setup-node@v4`).
- Dockerfiles must use minimal slim/alpine bases with proper `.dockerignore` files to prevent cache bloat.
- Commit must adhere to Conventional Commits specification.

---

### Task 1: Author GitHub Actions CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml` with backend and frontend jobs**
- [ ] **Step 2: Validate YAML syntax using Python `yaml` parser**

---

### Task 2: Containerize Backend & Frontend with Docker Compose

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`
- Create: `frontend/Dockerfile`
- Create: `frontend/.dockerignore`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create `backend/Dockerfile` and `backend/.dockerignore`**
- [ ] **Step 2: Create `frontend/Dockerfile` and `frontend/.dockerignore`**
- [ ] **Step 3: Create `docker-compose.yml` uniting backend and frontend**
- [ ] **Step 4: Validate docker-compose syntax using python yaml parser**

---

### Task 3: Update Documentation & Commit Milestone

**Files:**
- Modify: `README.md`
- Commit all staged and unstaged repo changes

- [ ] **Step 1: Update `README.md` with Docker Compose instructions**
- [ ] **Step 2: Run final local verification (pytest + pnpm build)**
- [ ] **Step 3: Stage all files and create milestone commit**
