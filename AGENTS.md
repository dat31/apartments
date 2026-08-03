<!-- BEGIN:nextjs-agent-rules -->
 
# Next.js: ALWAYS read docs before coding
 
Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.
 
<!-- END:nextjs-agent-rules -->

# Data access

**Every Supabase call lives in `lib/services/**`.** Nothing else imports a
Supabase client — a `no-restricted-imports` rule in `eslint.config.mjs` fails
the lint if it does. Components and hooks reach the database through thin
Server Actions in `lib/actions/**`.

The reason: a query and the checks that guard it have to be written in the same
place. RLS is the last line, not the only one — and the policies for the core
tables exist only in the deployed database (`supabase/README.md`), so a rebuilt
environment has nothing else.

## The layers

| Layer | Rule |
|---|---|
| `lib/services/<f>.ts` | `import "server-only"` on line 1. The only `.from()` / `.rpc()`. Returns domain types, never rows. |
| `lib/services/<f>-map.ts` | Pure row ↔ domain. No `server-only`, no cache, no React — the browser reuses it. |
| `lib/actions/<f>.ts` | `"use server"`. Validate with zod → call the service → `updateTag` → return `{ ok }`. Nothing else. |
| `hooks/use-<f>.ts` | `"use client"`. react-query keeps the cache and the optimistic blocks; `queryFn` / `mutationFn` call the action and `unwrap()` it. |

## Which client

| Client | For | Cacheable |
|---|---|---|
| `createPublicClient()` (`lib/supabase/public`) | anon-readable public data | yes — inside `"use cache"` |
| `createClient()` (`lib/supabase/server`) | anything per-user | **no** — cookie-bound, and cookies may not enter a cache boundary |

One feature file may hold both, in two commented sections. Getting it wrong
fails the build rather than leaking — `cookies()` inside `"use cache"` is an
error, and so is uncached data outside `<Suspense>`.

## Writing a service function

- Start per-user work with `requireUser()` (`lib/services/session.ts`). **Never
  take a user id as an argument** — the session decides whose data this is.
- State ownership in the query (`.eq("owner_id", user.id)`), then check that a
  row actually matched. A row that didn't is `not-found`, not a silent success
  the UI reports as done.
- Refuse with `throw new ServiceError(code)`. `toResult` in
  `lib/actions/result.ts` turns it into the `{ ok: false, error }` union the
  toasts already switch on. An unexpected error is logged server-side and
  flattened to `"failed"` — no Postgres message reaches the client.
- Cache tags are owned by the service that reads them (`reviewsTag`,
  `ownerTag`, `availabilityTag`) and imported by the action that busts them, so
  the two can't drift.

## Writing an action

- Take **intents, not column patches**. `acceptTour(id)`, not
  `update(id, { status: "confirmed" })` — a client that can name columns can
  set any of them.
- Re-validate every argument. A Server Action is a public HTTP endpoint; the
  page-level guard that rendered the button does not extend to it. The wire
  schema is static and lives in `schemas/<f>/` beside the form schemas — it
  guards a boundary, not a form, so it isn't built from a translator.
- Return only what the UI needs; return values are serialized to the client.
- `updateTag` only after a write succeeds — never as something a client can ask
  for on its own.

## Exceptions

These stay on a direct Supabase client, and the lint rule exempts them:

- `hooks/auth/**` and `components/providers.tsx` — the `@supabase/ssr` cookie
  bridge and `onAuthStateChange` have no server equivalent, and breaking it
  breaks every protected route.
- Storage **uploads** (`lib/supabase/storage.ts`) — Server Actions cap bodies at
  1 MB, so proxying a multi-MB panorama is strictly worse than a direct upload
  under Storage RLS. Deletes go through a service.
- `lib/supabase/middleware.ts` (owns session refresh) and
  `app/auth/confirm/route.ts` (`verifyOtp` writes the session cookie).

Adding an exception means editing `eslint.config.mjs`. That is the point.

# Server rendering

`cacheComponents` is on. A route is a static shell plus dynamic holes: anything
cookie-bound renders inside a `<Suspense>`, and the frame around it reads
nothing and prerenders per locale. `pnpm build` should report the route as `◐`.

## Every page pins its own locale

**A page whose subtree calls `getTranslations()` or `useTranslations()` on the
server must call `setRequestLocale(lang)` itself.** Its layout doing so is not
enough. Without it next-intl resolves the locale from the request, and that
read is attributed to the enclosing render rather than to the `<Suspense>` the
caller sits inside — so the route is rejected as blocking:

> Runtime data such as `cookies()`, `headers()`, `params`, or `searchParams`
> was accessed outside of `<Suspense>`.

Two traps in that message, both cost real time on the owner dashboard:

- **It blames the wrong file.** The stack points at `<NextIntlClientProvider>`
  in `app/[lang]/layout.tsx` — where the delay surfaces, not where the read is.
- **It is not about the cookies it names.** A cookie-bound service call inside
  a boundary is fine. Look for the translations call in a segment that never
  pinned its locale.

## `◐` is necessary, not sufficient

The build only prerenders the shell — it never executes the dynamic holes, and
it reported `◐` on all six dashboard routes while the error above fired on
every request. A route that renders on the server has to be **loaded once**
with `.next/dev/logs/next-development.log` watched. The same gap makes
`pnpm build` no evidence that a Server Component renders at all; mount it on a
throwaway route with fixture data if there is no signed-in way to reach it
(see the `verify` skill).

# Tests

Two suites, separated by file extension so neither runner picks up the other's
files:

- **`pnpm test`** — Vitest, `*.test.ts`. Unit tests for pure logic.
- **`pnpm test:e2e`** — Playwright, `*.spec.ts` under `e2e/`. Browser journeys.

## Where a unit test goes

In a `__tests__` folder **beside the module it covers** — never next to it, and
never in a mirrored top-level tree:

| Module | Test |
|---|---|
| `lib/stream/channel.ts` | `lib/stream/__tests__/channel.test.ts` |
| `app/[lang]/(app)/tour/lib/calendar.ts` | `app/[lang]/(app)/tour/lib/__tests__/calendar.test.ts` |
| `schemas/listing/index.ts` | `schemas/listing/__tests__/index.test.ts` |

One spec per module: don't collect several modules' tests into one file.

Shared fixtures live in `tests/factories.ts` (`@/tests/factories`) — use
`makeListing` / `makeTour` / `makeCosts` rather than hand-rolling objects, so a
schema change breaks in one place.

## What gets a unit test

Pure logic only: `lib/`, `schemas/`, and the app-local `lib/` directories.
Not the Supabase/Stream services, the Server Actions that wrap them, the
DB↔domain mapping layer, or React components — tests that mostly assert a mock
are worse than no test. Use the e2e suite for those paths instead.

This is why `vitest.config.ts` excludes `lib/services/**` and `lib/actions/**`
from coverage, and why a change to the data-access layer needs `pnpm test:e2e`
to have been exercised — the unit suite will not catch it.

Anything that reads a clock must be tested against a frozen one
(`vi.setSystemTime`), or it will pass today and fail next month.

## Passwords in fixtures

Never write a policy-satisfying password as a literal — secret scanners read it
as a credential. Use `VALID_PASSWORD` / `INVALID_PASSWORDS` from
`@/tests/factories`, which come from `TEST_USER_PASSWORD` when set and are
otherwise assembled from the character classes the policy requires. The e2e
suite reads its real account from `E2E_EMAIL` / `E2E_PASSWORD` in `.env.local`,
which is gitignored.