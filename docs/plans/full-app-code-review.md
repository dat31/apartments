# Plan: Full-app code review

> Handover doc for a future session. Written 2026-07-18 on branch
> `feat/tour-add-to-calendar`. This is a **review plan**, not a feature — it
> defines how to audit the entire codebase for correctness, security, and
> quality. Read §1 for scope, then execute §3 phase by phase. Findings
> format is in §5.
>
> **Status (2026-07-18): NOT STARTED.** Plan approved by the user; execution
> pending. No code has been read in depth yet — the scope snapshot in §1 is
> from a structural sweep only.

## 1. Scope snapshot

| Dimension | Detail |
|---|---|
| Stack | Next.js 16 (App Router) · React 19 · Supabase (SSR + RLS + 1 edge fn) · next-intl (vi default, en) · Tailwind v4 · shadcn/ui · TanStack Query · Zod · Leaflet |
| Size | ~256 TS/TSX files, ~22.7k LOC |
| Surface | 22 pages/layouts · 1 route handler (`app/auth/confirm/route.ts`) · 1 server-action file (`lib/actions/listings.ts`) · 1 proxy (`proxy.ts`) · 1 edge fn (`supabase/functions/saved-search-alerts`) · 3 migrations |
| Safety net | **No tests exist.** CI (`.github/workflows/ci.yml`) runs `pnpm lint` + `pnpm typecheck` only |

Because there is no test coverage, the review is the primary safety net — it
must weight **correctness and security** heavily, not just style.

## 2. Review dimensions (severity order)

1. **Security** — auth boundaries, RLS, secret exposure, injection, redirects.
2. **Correctness** — data-layer queries, mutation logic, edge cases, timezone/money math.
3. **Performance** — N+1 queries, server-first discipline, unnecessary client JS, caching.
4. **Consistency/quality** — reuse vs. duplication, i18n completeness, a11y, theme tokens.

## 3. Phases (ordered by blast radius)

### Phase 1 — Security & data access  *(highest priority)*
- `lib/supabase/*` — server vs. client vs. public client separation; confirm
  service-role/anon keys never reach the browser bundle.
- **RLS audit:** only 2 of 3 migrations define policies — check every table
  for row-level security; confirm owner-scoped data (listings, tours, saved
  searches, profiles) can't be read/written cross-user.
- `lib/actions/listings.ts` (the **only** server action) — auth checks, Zod
  validation at the trust boundary, ownership assertions before mutations.
- `proxy.ts` + `app/auth/confirm/route.ts` — session handling, open-redirect
  safety, cookie flags.
- `supabase/functions/saved-search-alerts` — mirrors `filterListings`; check
  for logic drift and injection. (See memory: edge fn must stay in sync.)

### Phase 2 — Data layer & server rendering
- `lib/data/*`, `lib/services/*` — query correctness, N+1 patterns, error
  handling, pagination bounds, null handling.
- Server-first discipline (repo `server-first-rendering` skill): unnecessary
  `"use client"`, data fetching leaked to client, Suspense/streaming boundaries.
- Caching/revalidation: `revalidatePath`/tag after mutations; stale-data risk.

### Phase 3 — Client state, hooks & forms
- `hooks/*` — TanStack Query key hygiene; the Next-16 bfcache stale-store
  gotcha (subscribe fns must call `onChange()` on reconnect — see memory).
- Forms: react-hook-form + Zod resolver consistency; `schemas/*` must match
  server-side validation.
- Utils: `lib/money.ts` (USD-stored, VND-converted rounding), `lib/geo.ts`,
  `lib/listing-costs.ts`, date/timezone (Da Nang UTC+7 pinning per calendar work).

### Phase 4 — i18n & SEO  *(hard constraint: don't break SEO)*
- Every user-facing string localized; no hardcoded text; `messages/`
  completeness across vi/en.
- `lib/seo.ts`, `app/sitemap.ts`, `app/robots.ts`, `components/json-ld.tsx`,
  `lib/og.tsx`, `[lang]` routing — canonical/hreflang correctness.

### Phase 5 — UI components & accessibility
- `components/` + `components/ui/` — reuse vs. duplication, prop typing.
- a11y: labels, keyboard nav, focus management in dialogs/drawers/lightbox.
- Theme: light/dark token usage, no hardcoded colors.

### Phase 6 — Config, tooling & the test gap
- `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, CI workflow.
- **Recommend a minimal test seed** (utils + a couple RLS/server-action
  integration tests) since none exist today.

## 4. Execution approach
- Run `pnpm lint` + `pnpm typecheck` first to clear mechanical noise.
- Read-through by phase. For breadth without blowing context, fan out
  read-only `Explore`/subagents per subsystem, then consolidate.
- For a single-branch diff instead of the whole app, `/code-review` (or
  `/code-review ultra` for the deep cloud pass) is the faster tool.

## 5. Findings format
Per phase, output findings **ranked by severity** (security > correctness >
perf > quality). Each finding:
- `file:line` anchor
- one-sentence defect statement
- concrete failure scenario (inputs/state → wrong result)
- suggested fix

## 6. Open decisions for the executing session
- Whether to also write the recommended test seed (Phase 6) or just flag it.
- Whether findings get filed as GitHub issues, a tracking doc, or fixed inline.
