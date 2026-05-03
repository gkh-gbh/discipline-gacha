# AGENTS.md

## Project Overview

Personal discipline/gacha app ("discipline-gacha") — a gamified task system where completing real-life tasks earns gacha pulls that unlock a "happiness budget" for guilt-free spending. Single-user, Chinese-language UI, localStorage-based persistence.

## Tech Stack

- Next.js 15 (App Router) + React 19 + TypeScript 5
- Tailwind CSS 4 (via `@tailwindcss/postcss`, not the v3 plugin)
- Lucide React for icons
- No backend — all state in localStorage under key `discipline-gacha-state`

## Commands

```bash
npm run dev          # Dev server on port 43017
npm run build        # Production build
npm run lint         # ESLint (next/core-web-vitals)
npm run start        # Serve production build on port 43017
```

No test framework is configured. No typecheck script — use `npx tsc --noEmit` if needed.

## Architecture

- `src/app/` — Next.js App Router pages: `/`, `/tasks`, `/pool`, `/wallet`, `/settings`
- `src/components/` — Shared UI: `app-state-provider.tsx` (React context for all state), `site-frame.tsx` (layout/nav), `ui.tsx` (reusable components)
- `src/lib/` — Core logic:
  - `storage.ts` — All state management, localStorage persistence, and mutation functions (~1400 lines, the main "backend")
  - `app-state.ts` — Derived state selectors and dashboard stats
  - `gacha.ts` — Gacha pull logic, pity system, reward tiers, rarity metadata
  - `task-rewards.ts` — Difficulty-to-reward mapping
  - `task-types.ts` — Task type metadata and series task grouping
  - `date.ts` — Date utilities, gacha pool open/close logic
  - `redeem.ts` — Dust redemption logic
  - `mock-data.ts` — Seed data for development
- `src/types/domain.ts` — All TypeScript types (AppState, Task, Wallet, GachaPull, etc.)

## Key Domain Concepts

- **Task types**: `daily` (auto-generated per day from templates), `series` (recurring habits with weekly targets), `main` (one-off important tasks)
- **Resources**: `gems` (for gacha pulls), `dust` (for guaranteed redemption)
- **Gacha**: Weekend-only pool (configurable days), 100 gems/pull, pity at 10 pulls for SR+
- **Wallet**: `rewardBalance` is the spendable "happiness budget" in ¥

## Conventions

- All pages are `"use client"` — no server components except the root layout
- State flows through `AppStateProvider` context; mutations are functions in `storage.ts`
- Path aliases: `@/*` maps to `./src/*`
- Date keys use `getLocalDateKey()` from `storage.ts` (local timezone, not UTC)
- Task difficulty levels: `simple`, `normal`, `medium`, `hard`, `breakthrough` (not "easy")

## Windows Dev Notes

- `start-dev.cmd` and `stop-dev.cmd` handle port 43017 lifecycle on Windows
- `start-dev.cmd` clears `.next` cache before starting
