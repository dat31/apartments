<!-- BEGIN:nextjs-agent-rules -->
 
# Next.js: ALWAYS read docs before coding
 
Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.
 
<!-- END:nextjs-agent-rules -->

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
Not the Supabase/Stream services, the DB↔domain mapping layer, or React
components — tests that mostly assert a mock are worse than no test. Use the
e2e suite for those paths instead.

Anything that reads a clock must be tested against a frozen one
(`vi.setSystemTime`), or it will pass today and fail next month.

## Passwords in fixtures

Never write a policy-satisfying password as a literal — secret scanners read it
as a credential. Use `VALID_PASSWORD` / `INVALID_PASSWORDS` from
`@/tests/factories`, which come from `TEST_USER_PASSWORD` when set and are
otherwise assembled from the character classes the policy requires. The e2e
suite reads its real account from `E2E_EMAIL` / `E2E_PASSWORD` in `.env.local`,
which is gitignored.