# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development commands

```bash
pnpm dev          # Start Vite dev server
pnpm build        # Type-check (tsc -b) then build for production
pnpm lint         # Run ESLint on all files
pnpm preview      # Preview production build locally
```

No test runner is configured yet.

## Architecture

This is a React 19 + TypeScript + Vite single-page control panel for a canteen dining simulation system. It talks to a backend at `http://localhost:23456/api`.

**Entry point:** `src/main.tsx` renders `<App>` inside `StrictMode` and `ToastProvider`.

**Pages (tab-based navigation, not a router):**
- `App.tsx` owns all top-level state, API callbacks, and a sidebar that switches between two pages via a `page` state variable (`PageState.DataManagerPage` / `PageState.MonitorPage`).
- `DataManagerPage.tsx` — CRUD for simulation datasets: create new ones (with parameters like arrival rate, dish ratios, seat count, per-window dish type and efficiency modifier), select the active dataset, or delete datasets.
- `MonitorPage.tsx` — real-time dashboard showing six current metrics, an SVG polyline history chart (with toggleable metric series), simulation start/pause/speed controls, per-window queue sizes, and seat occupation table.

**Toast system:** `Toast.tsx` provides `ToastProvider` (wraps the app) and `useToast()` hook via React Context. Call `showToast(message)` from anywhere to display a fixed-position toast for 3 seconds.

**API fetching patterns in `App.tsx`:**
- `fetchWithTimeout` — `fetch` wrapper that aborts via `AbortController` after a configurable timeout (default 5s). Accepts an optional external `AbortSignal` for unmount cleanup.
- Each poll function has its own `useRef` in-flight guard (e.g. `statusPending`, `dashboardPending`) to prevent overlapping requests.
- An `AbortController` created in the mount effect is passed to all poll functions and aborted on unmount, cancelling any in-flight requests.
- Empty catch blocks replaced with `console.error` + `AbortError` detection (graceful ignore on abort).
- `updateDataList` and `updateHistory` have independent locks (no shared `dataListLoading`). `updateDataList` only prunes stale history cache entries; `updateHistory` owns the cache entirely.

**API endpoints** (all relative to `http://localhost:23456/api`):
- `GET /status` — `{ online: boolean }`
- `GET /dashboard` — `DashboardResponse` (simulation state, current metrics, queue sizes, seat occupation)
- `GET /data/query` — list of stored simulation datasets + which is selected
- `POST /data/new` — create dataset with `SimulationParameters` body
- `POST /data/select/:id` / `POST /data/delete/:id` — select or delete a dataset
- `GET /history/range/:id?begin=&count=` — paginated `HistoryPoint[]` (page size 1000, fetched until `endingHasMore` is false)
- `POST /simulation/resume`, `/simulation/pause`, `/simulation/speed?speed=` — simulation control

**Polling:** On mount, the app polls `/status` and `/dashboard` every 1s, `/data/query` every 3s, and history every 1s (all via `setInterval`).

**Styling:** All styles in `src/App.css` (plain CSS). Compact operational dashboard aesthetic — dark sidebar (200px), white cards with 6px radius, small typography (11-14px), tight spacing (8-12px gaps). A thin `.status-bar` at the top replaces the old hero banner. Dark toast in `Toast.css`. Responsive at 1180px.
