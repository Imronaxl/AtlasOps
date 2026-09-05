# AtlasOps Dashboard (frontend)

Web dashboard for the AtlasOps infrastructure monitoring platform.
Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + framer-motion + Recharts.

## What it is

A UI layer on top of the FastAPI API (`../api/`) that lets you:

- See the live status of every service and metric
- Explore the architecture through an interactive diagram
- Read the incident log and the operational runbook
- Call API endpoints through an interactive explorer
- Watch an animated demo of typical CLI operations

## Run

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

By default the frontend talks to `http://localhost:8000` (where the FastAPI
from `../docker-compose.yml` lives). To point it elsewhere:

```bash
NEXT_PUBLIC_API_URL=http://my-api.local:8000 npm run dev
```

### Demo mode

If the FastAPI backend is not running, the UI does not crash — it switches to
mock data from `src/lib/mock-data.ts`. The header then shows a `demo` badge
instead of `live`. Handy for portfolio demos without spinning up Docker.

## Structure

```
src/
├── app/
│   ├── layout.tsx          # root layout, dark theme
│   ├── page.tsx            # main page: sidebar + section router
│   └── globals.css         # Tailwind + custom styles (terminal, glow, scanlines)
├── components/
│   ├── atlas/              # reusable atoms
│   │   ├── status-dot.tsx
│   │   ├── status-badge.tsx
│   │   ├── code-block.tsx
│   │   └── kpi-card.tsx
│   └── sections/           # seven navigation sections
│       ├── dashboard-section.tsx      # KPIs, charts, active incidents
│       ├── architecture-section.tsx   # interactive service diagram
│       ├── services-section.tsx       # table + service cards
│       ├── incidents-section.tsx      # timeline with filters
│       ├── runbook-section.tsx        # operational procedures
│       ├── api-section.tsx            # API explorer
│       └── cli-section.tsx            # animated terminal
└── lib/
    ├── types.ts            # shared contract with the backend
    ├── api.ts              # fetcher with mock fallback
    ├── mock-data.ts        # mirror mocks for demo mode
    └── format.ts           # formatting utilities
```

## Sync with the backend

The type contract lives in `src/lib/types.ts`. It must match the Pydantic
schemas in `../api/src/routes/*.py`. If the backend response shape changes,
update both the types and the mock data so the UI and API stay in sync.

## Tech

| Tech | Why |
|------|-----|
| Next.js 16 | App Router, RSC, fast refresh |
| TypeScript 5 | strict typing of the API contract |
| Tailwind CSS 4 | styling without CSS-in-JS |
| shadcn/ui | ready-made Radix components |
| framer-motion | section transitions and pulsing dots |
| Recharts | live metric charts |
| lucide-react | icons |
