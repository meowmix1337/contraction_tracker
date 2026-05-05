# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server
npm run build      # type-check + production build (tsc -b && vite build)
npm run lint       # ESLint
npm test           # run all tests once (vitest run)
npm run test:watch # watch mode
```

Run a single test file:
```bash
npx vitest run src/test/utils.test.ts
```

## Architecture

Single-page React app (Vite + TypeScript). No routing, no backend, no external state library.

**Data flow:**
- `useContractions` (`src/useContractions.ts`) is the sole source of truth. It owns all contraction state and syncs to `localStorage` (`contraction_tracker_data`) on every change. `App.tsx` consumes this hook directly — there is no context or global store.
- The `Contraction` type (`src/types.ts`) has `endTime: null` while a contraction is in progress. `duration` and `interval` are both in **seconds** as integers.
- `interval` is the gap from the previous contraction's `endTime` to the new one's `startTime`. The first contraction always has `interval: null`.

**Styling:** Plain CSS custom properties in `src/index.css` (design tokens) and `src/App.css` (all component styles). No CSS modules, no Tailwind. Dark theme only.

**Icons:** `lucide-react` only.

**Tests** live in `src/test/`. Hook tests use `vi.useFakeTimers()` to control `Date.now()` and advance time — always wrap state mutations in `act()`.
