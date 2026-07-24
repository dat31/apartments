# Messaging — unread badge on the nav "Messages" entry (technical guide)

> Written **2026-07-24**. Design + implementation guide only — nothing here is
> built. Resolves the decision `chat-implementation-plan.md` §12 deferred
> ("Global nav unread badge"): the approach is a **separate, socket-free
> client component** backed by a server-fetched count, with live updates
> bridged in on the pages that already hold a Stream connection.

## The constraint that shapes everything

`chat-implementation-plan.md` §3: **browsing costs no websocket**. The nav
badge appears in `site-header.tsx` / `mobile-nav.tsx`, which render on every
page — so the badge must never mount `MessagingProvider` (one
`useCreateChatClient` socket per page view) or instantiate any client-side
Stream client. That rules out the "just use the provider" shortcut and is why
the nav entries shipped as plain links in v1.

Two other constraints from the existing code:

- **The header is statically prerenderable.** `site-header.tsx` deliberately
  reads no server cookie (see its comment) so the `(app)` layout stays static;
  auth-dependent UI reveals after hydration via `useHydrated()`. A
  server-rendered count in the header would force the whole layout dynamic —
  rejected. The badge must be client-only and appear post-hydration, exactly
  like the saved-count chip.
- **The count must come from the server SDK, not a client Stream client.**
  `streamServer().getUnreadCount(userId)` (grounded:
  `stream-chat/dist/types/client.d.ts:699`, `getUnreadCount(userID?: string)`)
  is one API call, needs no token mint, no socket, and never touches the
  browser bundle. The browser talks HTTP to our own route; only the route
  talks to Stream.

## Architecture

```
every page                                   chat pages only
┌──────────────────────────┐                 ┌─────────────────────────────┐
│ site-header / mobile-nav │                 │ MessagingProvider            │
│  └ <MessagesUnreadBadge> │                 │  └ useUnread (socket events) │
│      └ useUnreadCount()  │                 │      └ setQueryData(key) ────┼──┐
└────────────┬─────────────┘                 └─────────────────────────────┘  │
             │ react-query key ['stream','unread-total', userId]  ←───────────┘
             ▼ (fetch when stale)
   GET /api/stream/unread  ── streamServer().getUnreadCount(userId) → { total }
```

One source of truth: the react-query cache entry. The badge *reads* it and
populates it over HTTP when stale; pages that already hold a socket *write*
into it from live events, so on those pages the badge updates instantly with
zero extra requests.

## Piece 1 — count route: `app/api/stream/unread/route.ts`

Mirrors the token route's shape (session cookie is the identity, never a
parameter; `Cache-Control: private, no-store`):

```ts
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" },
    { status: 401, headers: NO_STORE });

  try {
    const counts = await streamServer().getUnreadCount(user.id);
    return NextResponse.json(
      { total: counts.total_unread_count },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("[stream] unread count failed", error);
    return NextResponse.json({ error: "stream-unavailable" },
      { status: 502, headers: NO_STORE });
  }
}
```

Rules:

- **Pure read.** Unlike the token route, this must not `upsertUsers` and must
  not create anything — it runs on every page whose cache went stale.
- A user who has never opened chat still resolves: `getUnreadCount` for an
  unknown Stream user returns zeros rather than erroring (verify at
  implementation time; if it 404s, map to `{ total: 0 }`).
- Empty channels contribute nothing — unread counts only exist where messages
  exist — so there is no interaction with the empty-channel sweep
  (`messaging-empty-channels.md`).

## Piece 2 — hook: `hooks/use-unread-count.ts`

```ts
export const unreadKeys = {
  total: (userId: string | undefined) =>
    ["stream", "unread-total", userId ?? "guest"] as const,
};

export function useUnreadCount() {
  const { data: user } = useUser();
  const query = useQuery({
    queryKey: unreadKeys.total(user?.id),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,   // deliberate override, see below
    retry: 1,
    queryFn: async (): Promise<number> => {
      const res = await fetch("/api/stream/unread", { cache: "no-store" });
      if (!res.ok) throw new Error(`unread count failed: ${res.status}`);
      return (await res.json()).total ?? 0;
    },
  });
  return query.data ?? 0;
}
```

Decisions, with reasons:

- **Keyed on `userId`, `enabled` only when signed in** — the same pattern as
  the provider's credentials query, so a sign-out or account switch can never
  show the previous person's count.
- **`refetchOnWindowFocus: true` is a per-query override.** The app's
  `QueryClient` default is `false` (`components/providers.tsx`) — without the
  override, a user who tabs away, gets a message, and tabs back would see a
  stale badge until the next navigation.
- **No `refetchInterval`.** Freshness comes from navigation (staleTime 60s),
  window focus, and the live bridge (Piece 4). Polling would add a Stream API
  call per minute per open tab for marginal gain; add it later only if the
  badge is observed to lag in practice.
- Errors resolve to `0` (via `query.data ?? 0`) — a badge is decoration; it
  must never render an error state.

## Piece 3 — badge component: `components/messaging/unread-badge.tsx`

The separated client component. It owns the hook so the header stays exactly
as static as it is today — mirroring how `SaveHomeButton` owns `useSaved` so
the booking card can stay server-rendered.

```tsx
"use client";
export function MessagesUnreadBadge({ active }: { active: boolean }) {
  const hydrated = useHydrated();
  const total = useUnreadCount();
  if (!hydrated || total === 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-semibold tabular-nums",
        active ? "bg-primary-foreground text-primary"
               : "bg-primary text-primary-foreground"
      )}
    >
      {total > 99 ? "99+" : total}
      <span className="sr-only">unread messages</span>{/* localize via t() */}
    </span>
  );
}
```

- **Hydration gate:** the header renders the signed-out shell on the server
  and first client render (`useHydrated`); the badge must join that reveal or
  it reintroduces the hydration mismatch the header's comment warns about.
- **Chip classes copied from the saved-count chip** in `site-header.tsx` /
  `mobile-nav.tsx`, including the active-variant color swap — the two badges
  must be visually identical.
- **Cap at `99+`** — the design's `NavRow` renders the raw count, but a
  `min-w-5` chip distorts beyond two digits.
- The `sr-only` text goes through the `messaging` namespace
  (`messages/{vi,en}.json`), like every other string.

### Mount points

| File | Where | Notes |
|---|---|---|
| `components/site-header.tsx` | inside the Messages `<Link>`, after the label — same slot as the saved chip | pass `active={messagesActive}` |
| `components/mobile-nav.tsx` | the Messages row, before the chevron slot — same position as `savedCount` chip | drawer variant uses `bg-secondary-foreground text-secondary` when active, mirror the saved row |

## Piece 4 — live bridge in `MessagingProvider`

On pages that already hold a socket (`/messages`, `/tour`, owner dashboard),
the provider's `useUnread` state is fresher than any fetch. Bridge it into the
same cache entry:

```ts
// inside MessagingProvider, alongside the existing useUnread call
const queryClient = useQueryClient();
React.useEffect(() => {
  if (!client) return;               // pre-ready totalUnread is a hardcoded 0,
  queryClient.setQueryData(          // never write that over a real count
    unreadKeys.total(user?.id),
    totalUnread
  );
}, [client, totalUnread, user?.id, queryClient]);
```

The `!client` guard matters: `useUnread` resets to `EMPTY_UNREAD` while the
socket connects, and writing that transient `0` into the cache would blank a
correct badge for a second on every chat-page load.

This also makes the badge *live* exactly where liveness is cheap: the
provider's existing `notification.message_new` / `message.new` /
`notification.mark_read` handlers already maintain `totalUnread` from event
deltas (`event.total_unread_count` — grounded against the `Event` type), so
reading a thread on `/messages` zeroes the header badge instantly.

## Count semantics: messages, not conversations

`total_unread_count` (unread **messages**) rather than `unread_channels`:

- it matches the design prototype (`messaging.jsx`'s `ChatStore.unreadFor`
  sums per-channel unread message counts into the nav badge);
- it matches the per-row chips in the inbox and on tour cards, so the header
  number is always the sum of the numbers a user finds inside.

Both fields ride the same `GetUnreadCountAPIResponse` / events, so switching
later is a one-line change in the route and the bridge.

## Pitfalls checklist (each one is a known trap in this codebase)

1. ☐ No Stream client, token fetch, or `MessagingProvider` anywhere in the
   header tree — the route is the only Stream touchpoint (§3 principle).
2. ☐ Badge hidden until `useHydrated()` — the header's static-prerender
   contract.
3. ☐ `refetchOnWindowFocus: true` set **per query** — the app default is
   `false` and will silently freeze the badge otherwise.
4. ☐ Bridge writes gated on `client` being non-null — never write the
   pre-ready `0`.
5. ☐ Query keyed by `userId` and disabled when signed out.
6. ☐ Route performs no upsert and no channel creation.
7. ☐ `sr-only` label localized; no raw English in either locale.
8. ☐ Chip classes identical to the saved-count chip, both variants.

## File plan

```
app/api/stream/unread/route.ts        # Piece 1 — new
hooks/use-unread-count.ts             # Piece 2 — new
components/messaging/unread-badge.tsx # Piece 3 — new
components/messaging/chat-provider.tsx# Piece 4 — bridge effect added
components/site-header.tsx            # mount, pass active
components/mobile-nav.tsx             # mount, pass active
messages/{vi,en}.json                 # sr-only label under `messaging`
```

## Verification plan

- `curl` the route signed-out → 401 + `no-store`; signed-in (or via a
  temporary harness route calling `getUnreadCount` server-side) → `{ total }`.
- Badge states via the fixture-harness pattern used throughout the messaging
  work: 0 (hidden), 3, 120 (`99+`), light + dark, both nav surfaces,
  vi + en.
- Live bridge: on `/messages`, with a second seeded unread… **not drivable
  without two signed-in sessions** — same limitation recorded in PR #80; the
  bridge effect is unit-testable by asserting `setQueryData` against a mock
  query client if that gap matters.
- `typecheck` / `lint` / `build` clean; confirm `/` and `/apartments` still
  prerender statically in the build output (the badge must not have made the
  layout dynamic).

## Cost model

Per signed-in user: one internal fetch → one Stream API call per 60s-stale
navigation or tab focus. Zero on anonymous pages, zero extra on chat pages
(the bridge supersedes the fetch there). No new secrets, no new env.
