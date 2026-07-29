# Chat feature — detailed implementation plan (Stream Chat)

Renter ⇄ owner messaging for the apartments app, built on Stream Chat with the
`stream-chat` + `stream-chat-react` (v14) SDKs, matched to the Claude Design
project [apartment (Copy) — shadcn ui](https://claude.ai/design/p/6c642fad-9351-4009-bca4-88d8a5f71279),
file `messaging.jsx`.

Source material:
- Design: `messaging.jsx` (inbox, thread, composer), `nav_drawer.jsx` /
  `app.jsx` (nav badge), `screens_renter.jsx` ("Message owner" entry point).
- Requirements: [`docs/improvements/12-renter-owner-messaging.md`](../improvements/12-renter-owner-messaging.md).
- Stream skill: `.claude/skills/stream-react` (Track E — enhance an existing
  app), `sdk.md`, `references/CHAT-blueprints.md`.

> **Status note — prior art exists.** The unmerged branch
> `feat/renter-owner-messaging` (commits `c261cb3`, `d8a10cb`) contains a
> working v1 of exactly this feature, including a code review
> (`docs/plans/messaging-review-fixes.md` on that branch) and a remount-bug
> fix. The fastest path to shipping is rebasing that branch onto `main`. This
> plan is written to stand alone either way: it is the full spec, and every
> hard-won lesson from that branch is folded in as a requirement (§11), so a
> re-implementation lands at the reviewed end state, not the naive first draft.

---

## 1. Scope and product decisions

Two kinds of conversation, sharing one channel model and one UI:

1. **Tour-anchored threads** — created when a tour is booked; the booking
   `note` is seeded as the first message. Mounted inline on the renter tour
   cards (`/tour`) and the owner dashboard tour cards. They **expire**: frozen
   immediately when the tour is declined, and 7 days (grace period) after the
   tour slot passes. This is improvement doc #12's containment model.
2. **Listing-anchored threads** — started from "Message owner" on a listing
   detail page, per the design. Open-ended, one thread per
   (listing, renter) pair. Wider door than #12 proposed; the remaining
   containment: sign-in required, thread scoped to one listing, and Stream's
   own mute/block/ban machinery is available if abused.

Both surface in a **`/messages` inbox** (two-pane on desktop, list⇄thread on
mobile), reachable from the desktop header and mobile nav. The nav entries are
**plain links in v1 — no live unread badge**: a live badge would require a
Stream connection on every page, contradicting §3's "browsing costs no
websocket" principle. Unread badges live where the provider is mounted: inbox
rows and tour-card panels. A global badge is a deferred decision (§12).

**v1 excludes:** attachments (see §12), message editing UI beyond Stream
defaults, email nudges, reactions surfacing in the design (Stream has them
enabled on the `messaging` type; the themed UI keeps whatever the prebuilt
components show).

---

## 2. Design audit — `messaging.jsx` region → Stream mechanism

The design is a full messenger. Per the stream skill's design-matching rule,
each region is routed to a mechanism: **theming** (CSS variables — cheapest,
can't drop a feature), **injection** (custom component registered via
`WithComponents`), or **bespoke** (our own component outside Stream's tree).

| Design region | What it shows | Mechanism |
|---|---|---|
| Inbox two-pane shell | `grid-cols-[minmax(300px,360px)_1fr]`, `calc(100vh-14rem)` height; mobile shows list *or* thread with a back button | **Bespoke** shell (`inbox.tsx`) wrapping Stream's `ChannelList` + `Channel` |
| Conversation row | Square avatar block, name + verified check, relative timestamp, **listing title on its own line**, `You: ` preview prefix, unread count chip | **Injection** — custom `ChannelListItemUI` (v14 name; the old `ChannelPreview` is renamed) reading `listing_title` off channel custom data |
| Avatars | The app's square colour-block initials (`ProfileAvatar` + `PALETTE`), never photos | **Injection** — custom `Avatar` override; palette rides on the Stream user record (§5) |
| Thread header | Avatar, name + verified, "Usually responds …" / role subtitle, **listing chip** (thumbnail, title, price, "View →"), mobile back button | **Bespoke** (`thread-header.tsx`) — Stream's `ChannelHeader` has no listing chip slot |
| Message bubbles | Mine = primary bg right-aligned, theirs = muted left; square corners; clock time under each bubble | **Theming only** — bubble colors/radius are CSS variables, and timestamp placement per message group is CSS (`.str-chat__li--bottom` / `--single` grouping classes). **No custom `MessageUI`** — the docs' own guidance is theme-first, and a custom message component must reimplement reactions, deleted/edited states, reply counts, and quoted messages or they silently disappear |
| Day separators | Centered "Today / Yesterday / Wed, Jul 22" pill | **Theming** — Stream's `MessageList` renders date separators natively; restyle + localize via `Streami18n` |
| Composer | Auto-growing textarea (max ~132px), Enter-to-send / Shift+Enter newline, icon send button, "Press Enter to send" hint | Prebuilt `MessageComposer` (v14 — **not** `MessageInput`), themed; hint text is a bespoke line under it |
| Typing indicator | Three animated dots, left-aligned | Prebuilt — `typing_events` is on for the `messaging` type |
| Empty states | "No messages yet" + role-specific copy + "Browse homes" CTA; "Select a conversation" placeholder | **Injection** (`EmptyStateIndicator` override) + bespoke `NoThreadSelected` pane |
| Unread badges | Per-row chip in the inbox; per-tour badge on tour cards | Stream unread counts (§8). The design's nav badge is **deferred** — it needs a connection on every page (§12) |
| Read-only threads | (not in design — from #12) frozen notice instead of composer | **Bespoke** `thread-composer.tsx` switching on `channel.data.frozen` |

Design tone constraints that must survive: **square corners everywhere** (the
design system has no radius), app palette tokens (`--primary`, `--muted`,
`--secondary`…), `tabular-nums` timestamps, and localized copy (the design is
English-only; vi is the default locale — every string goes through next-intl).

### 2b. Customization strategy — four layers, lightest first (docs-checked)

Verified against the live Stream docs (theming, channel-list-preview,
message-ui guides, 2026-07-23). Ordered so each layer is only used when the
one above can't express the design:

1. **Theme prop** — `str-chat__theme-light` / `str-chat__theme-dark` on
   `<Chat>` from next-themes. Zero code.
2. **One CSS file** (`stream-theme.css`) — Stream's UI is driven by scoped CSS
   variables in two tiers (global + per-component), all under `.str-chat` so
   nothing leaks. Import the SDK stylesheet into a cascade layer so overrides
   win without specificity fights or `!important`:

   ```css
   @import "stream-chat-react/css/index.css" layer(stream); /* v14 alias per skill */
   @layer stream-overrides {
     .str-chat {
       /* map Stream tokens ← app theme tokens; exact names verified against
          node_modules/stream-chat-react/dist/css at implementation time */
       --str-chat__accent-primary: var(--primary);
       /* bubble bg/text (outgoing ← primary, incoming ← muted), panel
          backgrounds ← card/background, every *radius* variable → 0,
          font-family ← app font stack */
     }
   }
   ```

   This layer alone covers: bubble colors, square corners, day-separator pill,
   composer field styling, typing dots, and per-group timestamp visibility
   (the SDK stamps `.str-chat__li--top/--middle/--bottom/--single` grouping
   classes, so "clock time under the last bubble of a group" is a CSS rule).
3. **Three `WithComponents` injections** — only where the design is
   *structurally* different from the prebuilt region, and each is a leaf
   component with a documented, self-contained contract:
   - `Avatar` → the app's square `ProfileAvatar` colour block;
   - `ChannelListItemUI` → the design's conversation row (receives `channel`,
     `active`, `displayTitle`, `latestMessagePreview`, `unread`,
     `setActiveChannel` — the listing line reads `channel.data.listing_title`);
     preserve the `setActiveChannel` click contract so the list stays in sync;
   - `EmptyStateIndicator` → role-aware "no messages yet" copy.
4. **Bespoke only outside Stream's subtree** — the inbox two-pane grid, the
   thread header (listing chip has no prebuilt slot), and the
   frozen-`ThreadComposer` switch. These wrap Stream components; they never
   reimplement one.

**Explicitly rejected as too heavy:** custom `MessageUI` (must reproduce
reactions, deleted/edited states, reply counts, quoted messages — the
custom-ui completion contract — for a layout CSS already reaches) and a custom
composer UI (the only motivation was hiding the attachment button, which the
`uploads: false` channel config now does).

---

## 3. Architecture overview

```
Browser (client islands)                     Server
┌──────────────────────────────┐   ┌───────────────────────────────┐
│ MessagingProvider            │   │ GET /api/stream/token          │
│  ├ useCreateChatClient (1/pg)│──▶│  Supabase cookie → mint token  │
│  ├ <Chat> + WithComponents   │   │  upsert caller {name, palette} │
│  ├ unread state (context)    │   ├───────────────────────────────┤
│  ├ Inbox (/messages)         │   │ ensureTourChannel(tourId)      │
│  ├ TourChatPanel (tour cards)│──▶│ ensureListingChannel(listingId)│
│  └ ChatThread (shared)       │   │  server actions: RLS-checked   │
└──────────────┬───────────────┘   │  membership, seed note, freeze │
               │ websocket         └──────────────┬────────────────┘
               ▼                                  ▼ server SDK (secret)
        ┌─────────────────────── Stream Chat ───────────────────────┐
        │ channel type `messaging`; ids: tour-<uuid> / listing-<hash>│
        └────────────────────────────────────────────────────────────┘
```

Load-bearing principles:

- **Supabase stays the authority on who may talk to whom.** Stream never
  learns about tours or listings; server actions read the RLS-protected rows
  and only then set channel membership. The Supabase `auth.users` id **is** the
  Stream user id — no mapping table.
- **Server-first repo, client-island chat.** Chat is inherently
  websocket-driven, so the thread is a genuine client island. Pages that never
  show a thread never mount the provider — browsing costs no websocket.
- **Tokens are minted server-side for the caller only** — the session cookie is
  the sole identity input; there is no `user_id` parameter to forge.

---

## 4. Setup and configuration

Already done on this machine (do not repeat): `getstream init` — the Stream
org/app exists and `.stream/creds.yaml` (gitignored) holds CLI credentials.

Remaining setup:

```bash
getstream env                      # writes NEXT_PUBLIC_STREAM_API_KEY + STREAM_API_SECRET to .env.local
pnpm add stream-chat stream-chat-react   # pnpm, NOT npm — Track E preserves the repo's package manager
```

- Expect `stream-chat@9.x` + `stream-chat-react@14.x`. **v14 API**:
  `MessageComposer` (not `MessageInput`), `ChannelListItemUI` (not
  `ChannelPreview`), CSS at `stream-chat-react/css/index.css`.
- Both packages declare a `postinstall` that only runs a husky installer not
  shipped in the tarball. Record them in `pnpm-workspace.yaml` as
  `allowBuilds: false` so pnpm's unapproved-builds prompt doesn't wedge every
  later install.
- Vercel/CI: add `NEXT_PUBLIC_STREAM_API_KEY` and `STREAM_API_SECRET` to the
  deployment environment.

**Channel type:** use the built-in `messaging` type as-is — no
`CreateChannelType` call. Relevant defaults (verified via
`getstream api chat GetChannelType --name messaging`):

| Flag | Value | Consequence |
|---|---|---|
| `read_events` | true | unread counts work (badges depend on it) |
| `typing_events` | true | typing indicator is live |
| `reactions` | true | prebuilt reaction UI is live |
| `replies` | true | threaded replies available |
| `uploads` | **false** | disabled 2026-07-23 (`UpdateChannelType --name messaging --request '{"uploads": false}'`) — v1 is plain text, so the prebuilt composer shows no attachment button; see §12 |

---

## 5. Identity, tokens, and security

### `app/api/stream/token/route.ts` — `GET`, no parameters

1. `supabase.auth.getUser()` from the session cookie; `401` if absent.
2. Read `profiles.name, palette` for the caller (fall back to signup metadata
   → email, mirroring `hooks/use-profile.ts`).
3. `client.upsertUsers([{ id: user.id, name, palette }])` — **the requesting
   user only** (stream RULES: no auto-seeding), and **never pass `role`**:
   writing `role: 'user'` on every mint would silently demote anyone promoted
   in the Stream dashboard.
4. Mint with expiry: `client.createToken(user.id, exp)` where
   `exp = now + STREAM_TOKEN_TTL_SECONDS` (2 h). An unbounded token can't be
   revoked short of rotating the app secret.
5. Respond `{ chatToken, apiKey, userId, name }` with
   `Cache-Control: private, no-store`.

### Server-side Stream client — `lib/stream/server.ts`

`server-only` module; `StreamChat.getInstance(apiKey, apiSecret)` (singleton is
fine **server-side only**). Reads `STREAM_API_SECRET` from env; the secret
never reaches a client bundle and the agent/codebase never reads `.env.local`.

### Route protection

- `lib/supabase/middleware.ts`: add `/messages` to the `PROTECTED` regexes.
- `app/robots.ts`: add `/messages` to `PRIVATE_PATHS`; check `lib/seo.ts` for
  the same list.

---

## 6. Channel model

`lib/stream/channel.ts` — pure, client-safe, no Stream imports:

```ts
export const CHANNEL_TYPE = "messaging";
export const tourChannelId = (tourId: string) => `tour-${tourId}`; // uuid → 41 chars, legal
export const THREAD_GRACE_DAYS = 7;
export const STREAM_TOKEN_TTL_SECONDS = 2 * 60 * 60;
export function threadClosesOn(tour: TourRequest): string;  // parseYmd(tourSlot(tour).date) + grace  → ymd
export function isThreadClosed(tour: TourRequest): boolean; // declined → true; else todayYmd() > closesOn
```

- **Channel ids** accept `[A-Za-z0-9_-]`, max 64 chars. Two concatenated uuids
  (72 chars) don't fit, so listing threads use
  `listing-<sha256(listingId:renterId).slice(0,40)>`, derived **server-side**
  in `lib/actions/listing-chat.ts`. Nothing reverses the hash — consumers read
  `listing_id` off channel custom data.
- **Members:** exactly two — `tours.renter_id`/`tours.owner_id` (or
  `listings.owner_id` + the renter). The existing `set_tour_owner_id` DB
  trigger already guarantees `owner_id` is derived server-side, so it is
  trustworthy as a member.
- **Custom channel data** (`lib/stream/custom-data.ts`, module augmentation of
  `stream-chat`'s `CustomChannelData` / `CustomUserData`):

  ```ts
  channel: { tour_id?, listing_id, listing_title, tour_date?, tour_time? }
  user:    { palette?: number }
  ```

  ⚠️ `tour_date`/`tour_time` must store **`tourSlot(tour)`** — the *effective*
  slot — not `tour.date`/`tour.time`, or a rescheduled tour advertises the
  superseded slot while closing on the new one (prior review, finding 4).
- **Freeze** is a server-set channel-level flag, applied by the same server
  action that owns membership — **always via
  `channel.updatePartial({ set: { frozen } })`**, never `channel.update()`:
  a full update *replaces* channel custom data, silently wiping
  `listing_title` / `tour_date` / everything §6 stores.
  The client treats `channel.data.frozen` as the single source of truth for
  "can I write here" (§8, `thread-composer.tsx`).
- Tour `note` / reschedule proposals stay separate columns (per #12): the note
  is seeded as the thread's first message at creation; no data migration.

---

## 7. Server actions (channel provisioning)

Both are `"use server"`, idempotent, and safe to call on every open.

### `lib/actions/tour-chat.ts` — `ensureTourChannel(tourId)`

1. `supabase.auth.getUser()` → `unauthenticated` if absent.
2. Read the `tours` row **through the user's RLS-scoped client** — RLS already
   restricts it to the two parties, so a foreign tourId returns `not-found`.
3. Upsert both members' Stream users (`{ id, name, palette }` from `profiles`).
4. `client.channel(CHANNEL_TYPE, tourChannelId(tour.id), { members, created_by_id, ...customData }).create()`
   — create is idempotent for a fixed id.
5. Seed the booking `note` as the first message from the renter, sent with a
   **deterministic message id** (`${channelId}-note`) — the idempotency guard.
   A "seed only if the channel has no messages" check is a check-then-act race
   when booking and panel-open call this concurrently; a fixed id makes the
   second send a rejected duplicate instead.
6. Compute `isThreadClosed(tour)`; when it differs from the stored state,
   `channel.updatePartial({ set: { frozen: closed } })` (freeze *and*
   unfreeze — a rescheduled tour can reopen). Partial update only — see §6.
7. Return `{ ok: true, channelId, closed }` — the client must **use** the
   returned `closed`/frozen state, not re-derive it (finding 10).

Call sites: `hooks/use-book-tour.ts` (provision at booking so the note lands
immediately) and lazily from `TourChatPanel` when a thread is expanded
(covers tours booked before the feature shipped).

### `lib/actions/listing-chat.ts` — `ensureListingChannel(listingId)`

1. Auth as above.
2. Read `listings (id, title, owner_id)`; `not-found` if missing.
3. Guard: `listing.owner_id === user.id` → `{ ok: false, error: "own-listing" }`.
4. Derive `listingChannelId(listing.id, renterId)` (sha-256 hash, §6).
5. Upsert both users, create the channel with custom data
   `{ listing_id, listing_title }`, return `{ ok: true, channelId }`.

Result types are discriminated unions
(`{ ok: true, … } | { ok: false, error: "unauthenticated" | "not-found" | "own-listing" }`)
so the button can branch on error without try/catch.

---

## 8. Client architecture

### Connection lifecycle — `useCreateChatClient` (skill rule, no custom module)

Per the stream skill (`stream-react/RULES.md` > Strict mode protection;
`references/CHAT.md` > Client Patterns) there is **no hand-rolled connection
layer** — no module-level client, no manual `connectUser`/`disconnectUser`, no
ref-counted acquire/release:

- The provider calls the SDK's official hook:
  `useCreateChatClient({ apiKey, tokenOrProvider, userData: { id, name } })`.
  It owns instantiation, `connectUser`, strict-mode double-mount protection,
  and disconnect on unmount. Never `StreamChat.getInstance()` on the client
  (server-side only), and never wire `connectUser`/`disconnectUser` by hand —
  the skill calls out the exact race this produces
  (*"You can't use a channel after client.disconnect was called"*).
- `tokenOrProvider` receives an **async token provider** (a function hitting
  `/api/stream/token`), not a static string, so the 2 h expiry costs a silent
  refetch instead of a dropped connection (finding 3 — preserved, now via the
  hook's own parameter).
- One provider — and therefore one client — per page tree. Per-screen
  components only render `<Channel>` from the shared client; never a client
  per panel (`references/CHAT.md`: "Never instantiate a new `StreamChat` per
  screen").

### `components/messaging/chat-provider.tsx` — `MessagingProvider`

One per page that shows conversations (the `/messages` page, `/tour`, owner
dashboard tours). **Not** in the root layout.

Invariants (each one is a fixed bug — do not relax):

1. **Client creation is `useCreateChatClient` only** (skill rule — see §8's
   connection-lifecycle section). The hook returns `null` until the socket is
   up; `ready` is `client !== null`. While `null`, chat surfaces render inline
   skeletons and `<Chat>` is not yet mounted — children mount **once**, inside
   `<Chat>`, when the client exists. The prior branch's remount bug came from
   rendering children first and wrapping them in `<Chat>` after the token
   arrived; the hook-gated shape never mounts the same children in both
   states. Mount the provider so only chat-dependent UI sits behind this gate
   — non-chat page content (tour details, etc.) must not wait on the socket.
2. Credentials (`apiKey`, `userId`, `name`) fetch via TanStack Query
   (`useQuery`, `staleTime` under the 2 h TTL); the token itself is supplied
   to the hook as the async `tokenOrProvider`.
3. Context value:

   ```ts
   type MessagingState = {
     ready: boolean;                        // socket connected
     failed: boolean;                       // terminal token failure → error UI, not eternal skeleton
     unreadByTour: Record<string, number>;  // tour-card badges
     totalUnread: number;                   // inbox title count; NOT a global
                                            // header badge (deferred, §12)
   };
   export const useMessaging = () => useContext(MessagingContext);
   ```

4. Registers the custom components **once** via `<WithComponents overrides={messagingComponents}>`
   so the inbox and inline tour threads get identical UI.
5. Theme: `useTheme()` from next-themes → `str-chat__theme-dark|light` on
   `<Chat>`. i18n: `i18nInstance={streamI18n(locale)}` (§10).
6. CSS imported here (client boundary): a single
   `import "./stream-theme.css"` — that file `@import`s the SDK stylesheet
   into `layer(stream)` and puts overrides in `layer(stream-overrides)`
   (§2b), so ordering and specificity are structural, not accidental.

### Unread counts — inside the provider

- Seed once from **`client.getUnreadCount()`** — one request, every channel,
  no watches. Do **not** seed from `queryChannels({ watch: true, limit: 30 })`:
  it caps badges at 30 conversations and opens 30 watches just for numbers
  (finding 5).
- Keep live from event deltas: `notification.message_new` (fires for member
  channels the user is *not* watching — exactly this case), `message.new`
  (skip events where `user.id` is the connected user — own sends are not
  unread), `notification.mark_read`.
- `unreadByTour` mapping: `getUnreadCount()` returns per-channel entries keyed
  by cid (`messaging:tour-<uuid>`); recover the tour id by stripping the
  `messaging:tour-` prefix. Listing channels (hashed ids) don't map to a tour
  and only feed `totalUnread`.
- Never call `channel.stopWatching()` from thread cleanup — the client caches
  channel instances (`client.activeChannels`), so it unsubscribes shared state
  and freezes stale unread counts (finding 2). The hook owns connection
  lifetime; threads only `watch()`.
  ⚠️ **Marked deviation from the skill:** `references/CHAT.md` says "on
  per-channel unmount call `channel.stopWatching()`" (its rule targets
  single-view channel switching). Here several surfaces (inbox pane + tour
  panels) can share one cached channel instance, and the prior review showed
  stopping the watch from one surface breaks the others. The skill's hard
  rule — never `client.disconnectUser()` on channel unmount — holds either
  way (only the hook disconnects). If strict skill conformance is preferred
  over finding 2, flip this bullet and re-verify badge behavior in phase 5.

### `components/messaging/chat-thread.tsx` — shared thread island

Used by both the inbox pane and the inline tour panels.

- Resolve the channel **during render**: `client.channel(type, id)` is
  synchronous and cached. Do not hold it in state and clear it in effect
  cleanup — any effect re-run blanks a thread already on screen.
- `useEffect` calls `channel.watch()` once per channel id (track *which*
  channel was watched, not a boolean); check `channel.initialized` so
  reopening a thread is instant.
- Renders Stream's prebuilt tree:

  ```tsx
  <Channel channel={channel}>            {/* explicit channel — no ChannelList in this island */}
    <Window>
      <ThreadHeader />                    {/* bespoke, §9 */}
      <MessageList />                     {/* date separators on */}
      <ThreadComposer />                  {/* bespoke frozen-switch, below */}
    </Window>
  </Channel>
  ```

- `ThreadSkeleton` while `!ready`: an **inline** skeleton shaped like the
  thread. Never reuse `FullScreenLoader` — it is `fixed inset-0` and escapes
  the pane to cover the viewport.

### `components/messaging/thread-composer.tsx`

One component deciding write access for **every** surface: reads
`channel.data?.frozen` from channel state (live-updated by `channel.updated`
events) and renders either `<MessageComposer />` or the localized
"conversation closed" notice. The SDK will not save us here — v14's composer
has no capability gate; an unguarded composer on a frozen channel sends,
gets an API rejection, and shows nothing (finding 1).

---

## 9. Component structure (full file tree)

```
lib/stream/
  channel.ts            # §6 — pure helpers: ids, TTLs, isThreadClosed
  custom-data.ts        # module augmentation: channel + user custom fields
  server.ts             # server-only StreamChat singleton (secret)
  i18n.ts               # Streami18n instances, vi + en translation maps

lib/actions/
  tour-chat.ts          # ensureTourChannel
  listing-chat.ts       # ensureListingChannel (+ hashed id derivation)

app/api/stream/token/route.ts   # §5

app/[lang]/(app)/messages/page.tsx
  # Server component: metadata (noindex), auth-aware shell, renders <Inbox/>
  # inside <MessagingProvider/>. Streams nothing else — the page IS the island.

components/messaging/
  chat-provider.tsx     # MessagingProvider + useMessaging (§8)
  inbox.tsx             # two-pane shell; <ChannelList filters={{ type:'messaging',
                        #   members:{ $in:[userId] } }} sort={{ last_message_at:-1 }}/>
                        #   (userId from client.userID once ready)
                        #   + right pane <ChatThread/> | <NoThreadSelected/>;
                        #   deep-link ?channel=<id> via customActiveChannel;
                        #   mobile: list⇄thread swap w/ back — pass
                        #   setActiveChannelOnMount={false} so the phone lands
                        #   on the list, not an auto-selected first thread
  chat-thread.tsx       # shared thread island (§8)
  thread-header.tsx     # bespoke: avatar, name, subtitle, listing chip → Link
                        #   to /apartments/[id]; tour threads add the slot line
                        #   formatted with useFormatter (NEVER raw YYYY-MM-DD)
  thread-composer.tsx   # frozen-switch composer (§8)
  stream-components.tsx # WithComponents overrides: Avatar (ProfileAvatar block,
                        #   palette from client user cache, name-hash fallback),
                        #   ChannelListItemUI (design's ConversationRow),
                        #   EmptyStateIndicator (role-aware copy)
  stream-theme.css      # token bridge: str-chat CSS vars ← app theme tokens;
                        #   square corners, bubble colors, day-separator pill,
                        #   light + dark blocks
  message-owner-button.tsx  # listing detail CTA: signed-out → signin redirect;
                        #   owner-of-listing → hidden; else ensureListingChannel
                        #   → router.push(/messages?channel=<id>)
  tour-chat-panel.tsx   # inline-expanding "Messages" affordance on tour cards,
                        #   per-tour unread badge (useMessaging().unreadByTour)
  tour-thread-sync.tsx  # calls ensureTourChannel when a tour's status/slot
                        #   changes client-side so freeze state tracks reality
```

**Modified files**

| File | Change |
|---|---|
| `app/[lang]/(app)/apartments/[id]/components/detail-view.tsx` | mount `MessageOwnerButton` (owner card + mobile action row, per design) |
| `app/[lang]/(app)/tour/components/renter-tour-card.tsx` / `renter-tours.tsx` | mount `TourChatPanel`; wrap the list in `MessagingProvider` |
| `app/[lang]/(app)/owner/dashboard/components/owner-tour-card.tsx` / `owner-tours.tsx` | same, owner side |
| `components/site-header.tsx` | Messages **link** in the desktop cluster — no unread badge (§1; a badge would need a Stream connection on every page) |
| `components/mobile-nav.tsx` | Messages row **for both roles**, link only — the browse section must not stay renter-gated or `/messages` is unreachable on an owner's phone (finding 7) |
| `hooks/use-book-tour.ts` | fire-and-forget `ensureTourChannel` after booking |
| `lib/supabase/middleware.ts`, `app/robots.ts`, `lib/seo.ts` | protect + de-index `/messages` |
| `messages/vi.json`, `messages/en.json` | new `messaging` namespace |
| `pnpm-workspace.yaml` | `allowBuilds: false` for the two Stream packages |

---

## 10. i18n

- Every user-facing string in `messages/{vi,en}.json` under a `messaging`
  namespace (vi is the default locale — write it first). Strings: nav label,
  inbox title/subtitle, conversation count, empty states (renter + owner
  variants), "Select a conversation", closed-thread notice, composer
  placeholder + Enter hint, "Message owner", "View listing", error states.
- **Stream's own UI strings** (composer placeholder, date separators, typing
  indicator) go through `Streami18n` in `lib/stream/i18n.ts`: an instance per
  locale with a Vietnamese translation map for every key the mounted
  components use, passed as `i18nInstance` on `<Chat>`.
- **Dates:** the stored `YYYY-MM-DD` / `HH:mm` strings are locale-agnostic
  plumbing — format at the call site with next-intl's `useFormatter` +
  `parseYmd`, and the `new Date(2000, 0, 1, h, m)` idiom the tour cards
  already use. Interpolating raw ISO strings into translations shipped
  "Lịch xem ngày 2026-07-29 lúc 14:00" last time (finding 6).
- Relative row timestamps (`relTime` in the design): use `format.relativeTime`
  or Stream's `ChannelListItemTimestamp` with a locale-aware formatter.

---

## 11. Known-pitfall checklist (acceptance guardrails)

Each item below shipped as a bug in the prior attempt and was caught in review
(`docs/plans/messaging-review-fixes.md` on the branch) or the follow-up fix
commit. Treat them as acceptance criteria:

1. ☐ Frozen channels show the closed notice **everywhere** a composer could
   render (inbox included) — `thread-composer.tsx` is the only composer mount.
2. ☐ Collapsing a tour thread does not kill unread badges — no
   `stopWatching()` in cleanup; provider owns the connection.
3. ☐ Tokens carry a 2 h `exp`; the hook receives an async `tokenOrProvider`,
   never a static token string.
4. ☐ Channel custom data stores the tour's **effective** slot (`tourSlot`).
5. ☐ Unread seeds from `getUnreadCount()`, not a limited `queryChannels`.
6. ☐ No raw ISO dates in rendered copy; all through `useFormatter`.
7. ☐ `/messages` reachable on mobile for renters **and** owners.
8. ☐ Chat avatars use the profile `palette` index (via Stream user custom
   data), matching every other `ProfileAvatar` call site; name-hash only as
   fallback for unseen users.
9. ☐ No duplicated date-parsing helpers — reuse `parseYmd`.
10. ☐ Client consumes the server's `frozen`/`closed` result; no client-side
    re-derivation of thread lifetime for write-gating.
11. ☐ Chat surfaces gate on `useCreateChatClient`'s `null` → client
    transition with **inline** skeletons (never `FullScreenLoader`); non-chat
    page content never waits on the socket.
12. ☐ Threads resolve their channel synchronously during render;
    `channel.initialized` makes reopening instant.
13. ☐ Token route never sets `role` on upsert.
14. ☐ Channel mutations after creation use `updatePartial` only — a full
    `channel.update()` replaces custom data and wipes the thread's
    listing/tour context.
15. ☐ Client lifecycle is `useCreateChatClient` only — no module-level
    browser client, no manual `connectUser`/`disconnectUser`, no ref-counted
    acquire/release layer. The hook handles React strict-mode
    double-invocation internally (skill rule).

---

## 12. Open decisions

- **File attachments — RESOLVED (2026-07-23):** `uploads` disabled on the
  `messaging` channel type via
  `getstream api chat UpdateChannelType --name messaging --request '{"uploads": false}'`.
  This is an app-wide Stream setting; re-enable the same way if file uploads
  ever enter scope.
- **Tour attachments — IMPLEMENTED:** the design's "attach a tour" affordance
  ships as a custom message attachment (`type: "tour"`), independent of file
  uploads (which stay off). The picker replaces the SDK's `AttachmentSelector`
  slot (so no prebuilt upload/giphy menu appears), a staged tour rides on the
  composer's `attachmentManager` marked `uploadState: "finished"` so it composes
  into the message and enables send on its own, and the `Attachment` override
  renders a sent tour as a card. Scope is airtight through RLS: the picker only
  offers tours on this listing that both conversation members are party to
  (`hooks/use-attachable-tours.ts`). Files: `lib/stream/tour-attachment.ts`,
  `components/messaging/tour-attachment.tsx`,
  `components/messaging/tour-attachment-composer.tsx`.
- **Global nav unread badge** (the design shows one) — deferred. A live badge
  needs a Stream websocket on every page; the lightweight alternative is a
  server-fetched count (server SDK `getUnreadCount(userId)` rendered into the
  header per navigation, no socket), at the cost of one Stream API call per
  page load and a count that goes stale until the next navigation. Decide
  after v1 ships; nav entries are plain links until then.
- **Channel-creation flood** — any signed-in user can call
  `ensureListingChannel` for every listing, creating empty channels (not
  messages — sending still requires membership, which is only ever the two
  parties). Accepted for v1: channels are idempotent per (listing, renter),
  invisible until a message exists, and Stream-side slow mode / ban tooling
  covers escalation.
- **Email nudge** ("new message about your tour") — blocked on the email
  provider work in improvement #2; out of scope here.
- **`tours.note` double-render** on the owner card (once as the card's note
  block, once as the seeded first message) — cosmetic; revisit with #12's
  "system events inline" idea.

---

## 13. Implementation order

Phases are sequential; each ends verifiable.

1. **Foundation** — `pnpm add` + `allowBuilds`, `getstream env`,
   `lib/stream/{server,channel,custom-data}.ts`, token route.
   *Verify:* `pnpm run typecheck`; `curl` the token route unauthenticated → 401.
2. **Provisioning** — `lib/actions/{tour,listing}-chat.ts`; wire
   `use-book-tour`. *Verify:* typecheck; unit-level check of
   `isThreadClosed`/`threadClosesOn` around the grace boundary and `declined`.
3. **Client core** — `chat-provider.tsx` (with `useCreateChatClient`),
   `stream-components.tsx`, `stream-theme.css`, `lib/stream/i18n.ts`.
4. **Surfaces** — `chat-thread`, `thread-header`, `thread-composer`, `inbox`,
   `/messages` page, `message-owner-button`, `tour-chat-panel`,
   `tour-thread-sync`; mount points; nav + badges; middleware/robots/seo;
   i18n messages.
5. **Verify** —
   - `pnpm run typecheck` && `pnpm build` && `pnpm lint` clean.
   - Runtime per the repo's `verify` skill (headless puppeteer, auth-gated
     routes): two signed-in sessions (renter + owner), exercise: book tour →
     note appears as first message; owner replies → renter badge increments
     (header, mobile nav, tour card); decline tour → composer swaps to closed
     notice in both the card panel *and* the inbox; "Message owner" on a
     listing → thread opens at `/messages`; owner viewing own listing → no
     button; vi locale shows localized dates and Stream UI strings.
   - Screenshot smoke check of `/messages` in light + dark against the design
     (two-pane desktop, list⇄thread mobile).