# AtlasOps — Infrastructure Monitoring Platform

> A production-grade DevOps monitoring stack: FastAPI + PostgreSQL + Redis + Nginx + Prometheus + Grafana + Alertmanager — with an interactive Next.js dashboard on top. Built as a junior DevOps portfolio project.

![status](https://img.shields.io/badge/status-active-success?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![python](https://img.shields.io/badge/python-3.12-blue?style=flat-square)
![fastapi](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square)
![nextjs](https://img.shields.io/badge/Next.js-16-black?style=flat-square)
![docker](https://img.shields.io/badge/docker-compose-2496ED?style=flat-square)

---

## Table of contents

- [Overview](#overview)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Stack](#stack)
- [Repository structure](#repository-structure)
- [Quick start](#quick-start)
- [Frontend dashboard](#frontend-dashboard)
- [Backend API](#backend-api)
- [Monitoring](#monitoring)
- [Scripts](#scripts)
- [CI/CD](#cicd)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

**AtlasOps** is a self-hosted infrastructure monitoring platform that brings together everything a junior DevOps engineer needs to demonstrate end-to-end mastery:

- A **FastAPI** service exposing `/health`, `/status`, `/metrics` and a set of dashboard-friendly JSON endpoints.
- A **Docker Compose** stack with PostgreSQL, Redis, Nginx, Prometheus, Grafana, Alertmanager, node_exporter and cAdvisor — every service with a healthcheck.
- A **Next.js 16 dashboard** with seven interactive sections (live KPIs, architecture diagram, services table, incident timeline, runbook, API explorer, animated CLI demo).
- A **CI pipeline** that lints Python, TypeScript, YAML, shell and Markdown on every push.

The dashboard works in two modes:
- **`live`** — when the FastAPI backend is reachable, the UI fetches real data.
- **`demo`** — when the backend is down, the UI transparently falls back to mock data so you can demo the project anywhere without spinning up Docker.

---

## Screenshots

> All screenshots are in [`docs/screenshots/`](./docs/screenshots). They are referenced below with relative paths so they render natively on GitHub.

### 1. Dashboard

KPI cards, live CPU/Memory/Request-rate charts (Recharts), compact service list and active incidents. Auto-refreshes every 30s.

![Dashboard](docs/screenshots/01-dashboard.png)

### 2. Architecture

Interactive service topology. Click any block to see its details and connections. Three arrow types: `http` (solid green), `scrape` (dashed amber), `depend` (dotted grey).

![Architecture](docs/screenshots/02-architecture.png)

Clicking a node opens a modal with port, kind and connection list:

![Architecture modal](docs/screenshots/02b-architecture-modal.png)

### 3. Services

Full registry: table view on top, detailed cards below. Each card shows port, uptime, dependencies and the live health-check status.

![Services](docs/screenshots/03-services.png)

### 4. Incidents

Timeline with filters by severity (`critical` / `warning` / `info`) and by state (`all` / `active` / `resolved`). Each incident shows start, resolution time and duration.

![Incidents](docs/screenshots/04-incidents.png)

### 5. Runbook

Operational procedures as collapsible cards: deploy, backup, restore, high-CPU troubleshooting, disk-full recovery. Each step has a description, a command (with copy button) and the expected result.

![Runbook](docs/screenshots/05-runbook.png)

### 6. API Explorer

Interactive documentation of every FastAPI endpoint: method, path, description, `curl` example and a sample JSON response. Click an endpoint on the left, see its details on the right.

![API Explorer](docs/screenshots/06-api.png)

### 7. CLI demo

Animated terminal that types out typical `make` commands (`make up`, `make deploy`, `make backup`, `make healthcheck`) and reveals the output line by line. Play / Pause / Restart controls.

![CLI demo](docs/screenshots/07-cli.png)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                            │
│                           (nginx)                               │
│                            :80                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         ┌─────────┐ ┌─────────┐ ┌─────────┐
         │ /health │ │ /status │ │ /metrics│
         └────┬────┘ └────┬────┘ └────┬────┘
              │            │            │
              └────────────┼────────────┘
                           │
                      ┌────┴────┐
                      │   API   │
                      │(FastAPI)│
                      │  :8000  │
                      └────┬────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         ┌─────────┐ ┌─────────┐ ┌─────────┐
         │PostgreSQL│ │  Redis  │ │Prometheus│
         │  :5432   │ │  :6379  │ │  :9090   │
         └─────────┘ └─────────┘ └─────┬────┘
                                       │
                              ┌────────┼────────┐
                              │        │        │
                              ▼        ▼        ▼
                        ┌─────────┐ ┌───────┐ ┌──────────┐
                        │ Grafana │ │Alert  │ │Node      │
                        │  :3000  │ │Manager│ │Exporter  │
                        └─────────┘ │ :9093 │ │  :9100   │
                                    └───────┘ └──────────┘
```

The dashboard (Next.js, port 3000) sits beside this stack and talks to the FastAPI `/api/*` endpoints.

---

## Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Reverse proxy | Nginx 1.27 | Load balancing, security headers, rate limiting |
| API service | Python 3.12 + FastAPI | Health, status, metrics + JSON endpoints for the dashboard |
| Database | PostgreSQL 16 | Persistent storage |
| Cache | Redis 7 | Session cache, rate limiting |
| Metrics | Prometheus | Time-series metrics collection |
| Dashboards | Grafana | Visualization and alerting |
| Alerting | Alertmanager | Alert routing and notification |
| System metrics | node_exporter | Host-level metrics |
| Container metrics | cAdvisor | Per-container resource monitoring |
| Frontend | Next.js 16 + TypeScript + Tailwind + shadcn/ui | Interactive dashboard |

---

## Repository structure

```
atlasops/
├── .github/
│   └── workflows/
│       └── ci.yml                   # CI: lint Python, TS, YAML, shell, Markdown
├── .gitignore
├── .env.example                     # copy to .env and adjust
├── docker-compose.yml               # the whole stack in one file
├── Makefile                         # make up / down / build / backup / deploy / ...
├── README.md                        # this file
│
├── api/                             # FastAPI backend
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── src/
│   │   ├── main.py                  # app entry, middleware, router registration
│   │   ├── config.py                # pydantic-settings
│   │   ├── metrics.py               # Prometheus counters / histograms
│   │   └── routes/
│   │       ├── health.py            # /health, /ready
│   │       ├── status.py            # /status
│   │       ├── services.py          # /api/services
│   │       ├── incidents.py         # /api/incidents
│   │       ├── architecture.py      # /api/architecture
│   │       ├── metrics_snapshot.py  # /api/metrics/snapshot
│   │       └── runbook.py           # /api/runbook
│   └── tests/
│       ├── test_health.py
│       └── conftest.py
│
├── web/                             # Next.js dashboard
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── eslint.config.mjs
│   ├── postcss.config.mjs
│   ├── components.json              # shadcn/ui config
│   ├── public/
│   ├── README.md                    # frontend-specific docs
│   └── src/
│       ├── app/
│       │   ├── layout.tsx           # root layout, dark theme, fonts
│       │   ├── page.tsx             # main page: sidebar + section router
│       │   └── globals.css          # Tailwind + custom styles
│       ├── components/
│       │   ├── atlas/               # reusable atoms
│       │   │   ├── status-dot.tsx
│       │   │   ├── status-badge.tsx
│       │   │   ├── code-block.tsx
│       │   │   └── kpi-card.tsx
│       │   └── sections/            # seven UI sections
│       │       ├── dashboard-section.tsx
│       │       ├── architecture-section.tsx
│       │       ├── services-section.tsx
│       │       ├── incidents-section.tsx
│       │       ├── runbook-section.tsx
│       │       ├── api-section.tsx
│       │       └── cli-section.tsx
│       └── lib/
│           ├── types.ts             # shared contract with backend
│           ├── api.ts               # fetcher with mock fallback
│           ├── mock-data.ts         # demo-mode data
│           └── format.ts            # formatters (uptime, relative time, …)
│
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf                   # rate-limit, security headers, JSON logs
│
├── postgres/
│   └── init.sql                     # schema: services, incidents + triggers
│
├── redis/
│   └── redis.conf                   # AOF, maxmemory 256mb, LRU
│
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus.yml
│   │   └── alert.rules.yml
│   ├── alertmanager/
│   │   └── config.yml
│   └── grafana/
│       ├── dashboards/
│       │   └── infrastructure.json
│       └── provisioning/
│           ├── dashboards/provider.yml
│           └── datasources/datasource.yml
│
├── scripts/
│   ├── deploy.sh                    # zero-downtime deploy
│   ├── backup.sh                    # pg_dump + gzip
│   ├── restore.sh                   # restore with safety backup
│   ├── healthcheck.sh               # full health verification
│   ├── rotate_logs.sh               # log rotation
│   └── cleanup.sh                   # docker prune
│
├── systemd/
│   └── infra-monitor.service        # optional systemd unit
│
└── docs/
    ├── architecture.md
    ├── deployment.md
    ├── monitoring.md
    └── screenshots/                 # dashboard screenshots for README
        ├── 01-dashboard.png
        ├── 02-architecture.png
        ├── 02b-architecture-modal.png
        ├── 03-services.png
        ├── 04-incidents.png
        ├── 05-runbook.png
        ├── 06-api.png
        └── 07-cli.png
```

---

## Quick start

### 1. Clone

```bash
git clone https://github.com/imronaxl/atlasops.git
cd atlasops
```

### 2. Configure environment

```bash
cp .env.example .env
# edit .env — change every "change_me_*" placeholder
```

### 3. Bring the stack up

```bash
make up
make status
```

You should see 9 healthy containers: `nginx`, `api`, `postgres`, `redis`, `prometheus`, `grafana`, `alertmanager`, `node-exporter`, `cadvisor`.

### 4. Start the dashboard

```bash
cd web
npm install
npm run dev
```

Open <http://localhost:3000> — the header indicator should switch from `demo` to `live`.

### 5. Access individual services

| Service | URL | Credentials |
|---------|-----|-------------|
| Dashboard | http://localhost:3000 | — |
| API (FastAPI) | http://localhost:8000 | — |
| Grafana | http://localhost:3000 | admin / (from .env) |
| Prometheus | http://localhost:9090 | — |
| Alertmanager | http://localhost:9093 | — |

> The dashboard runs on port 3000 — the same as Grafana by default. To avoid the conflict, either stop Grafana (`docker compose stop grafana`) or run the dashboard on another port: `npm run dev -- -p 3001`.

---

## Frontend dashboard

The dashboard is a Next.js 16 application under [`web/`](./web). It has seven sections reachable from the sidebar:

| Section | What it shows |
|--------|----------------|
| **Dashboard** | KPIs (services up, CPU, memory, P95 latency), live Recharts graphs, active incidents |
| **Architecture** | Interactive service topology with click-to-explore node details |
| **Services** | Registry table + detail cards: status, port, image, uptime, dependencies |
| **Incidents** | Timeline with severity and active/resolved filters |
| **Runbook** | Step-by-step operational procedures with commands and expected results |
| **API** | Interactive endpoint explorer: method, path, curl, JSON response example |
| **CLI** | Animated terminal demo of `make up`, `make deploy`, `make backup`, … |

### Key features

- **Live / demo mode**: the API client has a 2.5s timeout and falls back to mock data. The header shows `live` or `demo` and re-checks every 30s.
- **Dark theme** by default — familiar for DevOps tooling (Grafana, Datadog, …).
- **framer-motion** transitions between sections, pulsing status dots, terminal typing effect.
- **Responsive**: sidebar on desktop, horizontal scroll menu on mobile.
- **No external data needed**: the mock layer mirrors the backend so the UI is fully functional on its own.

See [`web/README.md`](./web/README.md) for frontend-specific details.

---

## Backend API

FastAPI app under [`api/`](./api). Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe — used by docker healthcheck |
| GET | `/ready` | Readiness probe (checks dependencies) |
| GET | `/status` | Application summary: version, env, uptime |
| GET | `/metrics` | Prometheus text format metrics |
| GET | `/api/services` | List of all monitored services |
| GET | `/api/services/{name}` | Single service by name |
| GET | `/api/services/{name}/health` | Simplified health for one service |
| GET | `/api/incidents` | Incident log (`?severity=`, `?resolved=` filters) |
| GET | `/api/incidents/active` | Only active (unresolved) incidents |
| GET | `/api/architecture` | Service graph (nodes + edges + legend) |
| GET | `/api/metrics/snapshot` | Hour-long metrics snapshot, ready for Recharts |
| GET | `/api/runbook` | All operational procedures |
| GET | `/api/runbook/{id}` | Single procedure by id |

CORS is open for development. In production, narrow `allow_origins` in `api/src/main.py` to your real domain.

---

## Monitoring

### Access points

| Service | URL |
|---------|-----|
| Grafana | http://localhost:3000 |
| Prometheus | http://localhost:9090 |
| Alertmanager | http://localhost:9093 |

### Dashboards

- **Infrastructure Monitoring** — CPU, Memory, Disk, Network, Containers, API metrics

### Alert rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighCPUUsage | CPU > 80% for 5m | Warning |
| HighMemoryUsage | Memory > 90% for 5m | Warning |
| HighDiskUsage | Disk > 85% for 5m | Warning |
| ContainerDown | Container down for 1m | Critical |
| ContainerHighCPU | Container CPU > 80% for 5m | Warning |
| APILatencyHigh | p95 > 1s for 5m | Warning |
| HighErrorRate | 5xx > 5% for 5m | Critical |
| DiskSpaceLow | < 5GB free for 5m | Critical |

---

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/deploy.sh` | Zero-downtime deployment |
| `scripts/backup.sh` | PostgreSQL backup with compression |
| `scripts/restore.sh` | Database restore with safety backup |
| `scripts/healthcheck.sh` | Comprehensive health verification |
| `scripts/rotate_logs.sh` | Log rotation and cleanup |
| `scripts/cleanup.sh` | Docker resource cleanup |

Convenient Makefile targets wrap all of them: `make deploy`, `make backup`, `make restore`, `make healthcheck`, `make rotate-logs`, `make cleanup`.

---

## CI/CD

Pipeline lives in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml). On every push / PR to `main`:

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  backend    │  frontend   │   docker    │    misc     │
│ (FastAPI)   │ (Next.js)   │ (compose)   │ (yaml/sh/md)│
├─────────────┼─────────────┼─────────────┼─────────────┤
│ ruff lint   │ npm install │ compose     │ yamllint    │
│ ruff format │ eslint      │  config     │ shellcheck  │
│ pytest      │ tsc --noEmit│ hadolint x2 │ markdownlint│
└─────────────┴─────────────┴─────────────┴─────────────┘
```

All four jobs run in parallel. The pipeline must be green before merge.

---

## Roadmap

- [ ] WebSocket push for live metrics (replace 30s polling)
- [ ] NextAuth.js authentication for the dashboard
- [ ] Per-service detail pages with historical charts
- [ ] PDF export of runbook procedures
- [ ] Terraform / Ansible provisioning for cloud deployment
- [ ] Multi-node Prometheus federation via Thanos

---

## License

MIT — see [LICENSE](./LICENSE).
