# Instant-navigation rig

How this repo proves a route's static shell still commits immediately, and
keeps proving it. Written for the `next-cache-components-optimizer` loop; read
this before touching `playwright.instant.config.ts` or anything in
`e2e/instant/`.

## Why a second Playwright config

`instant()` (from `@next/playwright`) holds every per-request read back and
asserts the route's prerendered shell reaches the browser anyway. That verdict
is only meaningful against a production build — `next dev` does not prefetch,
and its lock is unreliable for blocking routes — so this rig never runs there.
The main suite (`playwright.config.ts`) stays on `next dev`; the two do not
share a server.

## The six questions

**BUILD** — `EXPOSE_TESTING_API=1 pnpm build:local`. `build:local` wraps
`next build` in `dotenv -e .env.local`, which is where the Supabase and Stream
keys live.

**EXPOSE** — `experimental.exposeTestingApiInProductionBuild` in
`next.config.ts`, gated on `process.env.EXPOSE_TESTING_API === "1"`. Nothing
sets that but this rig, so it is never on in production. This is the single
most important line in the setup: without it `instant()` silently no-ops and
every spec in `e2e/instant/` passes while measuring nothing.

**RUN** — `EXPOSE_TESTING_API=1 pnpm start` on `http://localhost:3000`.
`playwright.instant.config.ts` builds *and* starts on every run, because
`pnpm dev` and `pnpm build` write to the same `.next` directory and serving a
stale or dev-polluted one produces a confident, wrong answer. For a tight fix
loop, build and start by hand once and set `PW_INSTANT_REUSE=1` to attach.

**TEST USER** — `E2E_EMAIL` / `E2E_PASSWORD` from `.env.local`, signed in once
by `e2e/auth.setup.ts` and reused via `storageState`. `/messages` and
`/owner/dashboard` are both behind `PROTECTED` in `lib/supabase/middleware.ts`.
Unlike the main suite, the specs here **fail** rather than skip when the
credentials are missing (`requireSession` in `e2e/instant/shell.ts`): without a
session those routes redirect to `/signin`, and a suite that skips reports
green while guarding nothing.

**DRIFT** — the environment the specs assume, all pinned in the config or
`e2e/fixtures.ts`:

- `locale: "vi-VN"` — vi is the default locale and every shell marker is
  Vietnamese copy. A Chromium asking for `en` resolves different text on
  unprefixed URLs and the markers stop matching.
- `theme: light`, forced via `localStorage` before load.
- `**/ingest/**` aborted so runs don't ship PostHog events.
- Da Nang geolocation, granted — the map and tour views ask for it.
- Viewports are explicit: `desktop` at 1280×800, `mobile` at 390×844. Both run
  the same public specs, which is what makes "the shell matches the real render
  at every breakpoint" a checked gate rather than an intention.

**LOOP** — local `next build && next start`. No liveness probe: the build is
local and the config rebuilds every run, so there is no deployed artifact that
could lag behind the working tree.

## What the specs assert, and the trap they avoid

A passing spec says the prerendered shell committed without waiting on
per-request data. It does **not** say the shell is worth looking at — a route
that prerenders an empty frame passes just as happily. Two things guard that:

1. Every marker in `e2e/instant/shell.ts` is a real, visible, non-empty piece
   of the page (`expectShell` asserts the text, not just visibility).
2. `browse.spec.ts` asserts the *negative* as well: under the lock the listing
   cards must still be absent, and present after release. If the testing API
   ever stops being exposed, that assertion fails instead of the suite quietly
   going green and blind. Do not delete it.

Markers are chosen so they cannot be per-request data. `/owner/dashboard` keys
off a nav label rather than the owner's name; `/apartments/[id]` off the back
link rather than the listing title. Asserting the data would invert the test —
it could then only pass when the route is *not* instant.

## Running it

```bash
pnpm test:e2e:instant                                  # builds, serves, runs everything

# tight loop against a build you already have running
EXPOSE_TESTING_API=1 pnpm build:local
EXPOSE_TESTING_API=1 pnpm start
PW_INSTANT_REUSE=1 pnpm test:e2e:instant --project=desktop
```

## Status

| Navigation | Guarded | Notes |
|---|---|---|
| `/apartments` initial load | ✅ green | also carries the lock-engagement assertion |
| `/apartments` → `/apartments/[id]` soft nav | ✅ green | |
| `/apartments/[id]` initial load | ✅ green | |
| `/` → `/apartments` soft nav | ❌ `test.fixme` | real gap, see below |
| `/messages` | ⏸ written, never run | needs `E2E_EMAIL` / `E2E_PASSWORD` |
| `/owner/dashboard` | ⏸ written, never run | needs `E2E_EMAIL` / `E2E_PASSWORD` |

Stable across `--repeat-each=5` on both viewport projects.

## What the loop found

**`/messages` was blocking, and is not any more.** The page awaited
`searchParams` in its body to resolve `?channel=`, a request-time read above
every boundary. Nothing below it could prerender. Measured on the prerendered
artifact, with only that fix reverted and re-applied between two builds of the
same tree:

| `.next/server/app/vi/messages.html` | before | after |
|---|---|---|
| size | 10.8 KB | 95.4 KB |
| `<h1>` | none | `Tin nhắn` |
| inbox skeleton | no | yes |
| route | ◐ Partial Prerender | ○ Static |

Before, the entire static shell was the `(app)` group's full-screen spinner.
The URL read now happens on the client below a boundary
(`components/messaging/inbox.tsx`), so the heading and the inbox skeleton
prerender and the conversations stream in behind them.

**`/` → `/apartments` is not instant, and this loop cannot fix it.** The
browse shell is fully prerendered and its initial load is instant. But the
router's `<Link>` prefetch of `/apartments` is ~910 bytes carrying no `<h1>` —
the route tree and the loading boundary, nothing more. A soft navigation
therefore has no shell to commit and renders `apartments/loading.tsx`, whose
heading slot is a grey skeleton bar; the real shell arrives from the network
afterwards. No further push-down in `browse.tsx` changes this. Adopting
Partial Prefetching is what closes it.

The detail route is the control that proves this is real rather than a bad
marker: `apartments/[id]/loading.tsx` renders its back link as a bare
`Skeleton`, so the detail marker cannot match the fallback — and it commits
under the lock every time.

## Known gaps

- **The landing page's primary CTA is not a link.** The role cards in
  `app/[lang]/components/role-cards.tsx` are `<button>` + `router.push`, so the
  destination is never prefetched and that navigation cannot be instant. The
  click also writes the profile role, so making it a `<Link>` is a behavior
  change, not a mechanical fix — left alone deliberately. The guarded
  landing → browse navigation uses the showcase "see all" link instead.
- **Partial Prefetching is not adopted** (`partialPrefetching` is unset and no
  route opts in). Until it is, soft navigations do not share an App Shell, and
  a `<Link>` prefetch stops at the destination's loading boundary rather than
  carrying its static shell. This is the direct cause of the `/` → `/apartments`
  gap above, and the highest-value next step for this app's navigation. The
  `next-partial-prefetching-adoption` skill drives it.
- **The auth-gated half has never run.** `e2e/instant/authed/` is written but
  unexecuted — there are no `E2E_EMAIL` / `E2E_PASSWORD` in this environment, so
  `/messages` and `/owner/dashboard` redirect to `/signin`. The `/messages` fix
  is verified on the prerendered artifact (above), not end to end. Run
  `e2e/instant/authed/_baseline.spec.ts` first when credentials exist, confirm
  both markers render, then delete it.
