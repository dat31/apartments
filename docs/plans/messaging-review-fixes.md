# Messaging review — findings and fixes

Review of the unmerged renter↔owner messaging work (Stream Chat): `lib/stream/*`,
`lib/actions/{tour,listing}-chat.ts`, `app/api/stream/token`,
`components/messaging/*`, plus the nav/route changes that expose `/messages`.

Typecheck and ESLint were clean before and after — everything below is
behavioural. Findings are ordered by the damage they do, not by where they sit
in the code.

---

## P0 — correctness and security

### 1. Closed threads are writable from the inbox

`components/messaging/inbox.tsx` rendered `<MessageComposer>` unconditionally.
The read-only treatment for a closed thread existed only in `ChatThread`, which
the inbox does not use — so a declined tour's frozen channel showed a live
composer at `/messages`.

The SDK does not save us here: `canSendMessage`
(`channelCapabilities['send-message']`) is only consumed by `useUserRole` for
message-retry actions; the composer itself has no capability gate. The send
reaches the API and is rejected, with nothing in the UI explaining why.

**Fix.** New `components/messaging/thread-composer.tsx` — one component that
reads `channel.data?.frozen` off the channel state and renders either the
composer or the closed notice. Both the inbox and `ChatThread` use it. The
server's `frozen` flag becomes the single source of truth for "can I write
here", which also removes the client-side re-derivation in finding 10.

### 2. Collapsing a tour thread killed its unread badge

`ChatThread`'s effect cleanup called `stopWatching()`. `client.channel(type, id)`
returns the *cached* instance out of `client.activeChannels` — the same object
`useUnread` had watched via `queryChannels({ watch: true })`. Collapsing a tour
card therefore unsubscribed the whole client from that channel's events, and
because `stopWatching` leaves the object in `activeChannels`, `countUnread()`
kept returning the stale pre-collapse value rather than disappearing.

**Fix.** Folded into finding 5 — the provider no longer watches channels at all,
so there is no shared watch to tear down. `ChatThread` keeps its `watch()` (it
needs the state) and no longer calls `stopWatching()`; the provider owns
connection lifetime.

### 3. Chat tokens never expired

`client.createToken(user.id)` omits the optional `exp`, so the minted JWT had no
expiry claim. Signing out did not invalidate it, and revoking it meant rotating
the app secret. `chat-provider.tsx` set `staleTime: 50 * 60 * 1000` under a
comment asserting tokens "expire" — the refresh cadence was written against an
expiry the server never set.

**Fix.** Tokens now carry a 2 hour `exp`, shared via `STREAM_TOKEN_TTL_SECONDS`.
Because a static token string cannot be refreshed once it lapses, the client now
passes a **token provider** to `useCreateChatClient` instead of a fixed string,
so the SDK re-fetches `/api/stream/token` on expiry and reconnects by itself.

### 4. Rescheduled tours advertised the superseded slot

`ensureTourChannel` wrote `tour_date`/`tour_time` from `tour.date`/`tour.time`,
but `isThreadClosed` derives the thread's lifetime from `tourSlot(tour)`, which
returns the *proposed* slot once `status === 'reschedule'`. A tour moved from
25 Jul 09:00 to 2 Aug 15:00 showed the abandoned July slot in the thread header
while closing on the August date. `lib/stream/custom-data.ts` documents the field
as "the tour's effective slot", so the data was not what its own contract said.

**Fix.** Store `tourSlot(tour)` for both fields.

### 5. Unread badges were capped at 30 conversations

`useUnread` seeded from a single `queryChannels(..., { limit: 30 })` and derived
everything from `client.activeChannels`. Past 30 conversations, older tours never
entered the map and `useTourUnread` fell through to its `?? 0`, so a new message
on an older tour produced no badge at all. The same call also opened 30 channel
watches on page load purely to feed badges.

**Fix.** Replaced with `client.getUnreadCount()` — one request, every channel,
no watches — seeded once and then kept live from event deltas.
`notification.message_new` is delivered for member channels the user is *not*
watching, which is precisely this case, so dropping the watches costs nothing.
This is the change that also resolves finding 2.

---

## P1 — user-visible defects

### 6. Raw ISO dates in the thread header

`ThreadHeader` interpolated the stored `YYYY-MM-DD` and `HH:mm` strings straight
into `t('tourOn')`. `constants/tours.ts` states the rule: the ymd helpers are
locale-agnostic plumbing and display formatting happens at the call site with
`useFormatter`. A Vietnamese user read "Lịch xem ngày 2026-07-29 lúc 14:00".

**Fix.** Format with `format.dateTime(parseYmd(date), …)` and the
`new Date(2000, 0, 1, h, m)` time idiom both tour cards already use.

### 7. `/messages` was unreachable on mobile

The nav entry went into the `hidden md:flex` desktop cluster only; `MobileNav`
was never given the link. On a phone the sole route into the inbox was pressing
"Message owner" on some listing.

**Fix.** `messagesActive` threaded through to `MobileNav`, and a Messages row
added to its browse section. That section was gated behind `!isOwner` (it held
only renter links); it now always renders, with Tours and Saved still
renter-only, matching the desktop header where Messages is shown to both roles.

### 8. Chat avatars used a different colour than the rest of the app

`paletteFor` hashed the display name, ignoring the `palette` index stored on
every profile and passed by every other `ProfileAvatar` call site. The same
person appeared as one colour in the account menu and another in the inbox —
defeating the function's own comment about keeping one colour per person.

**Fix.** `palette` now rides on the Stream user record (`CustomUserData`
augmentation, written by both server actions and the token route), and
`MessagingAvatar` resolves it from the client's user cache. Stream hands avatar
overrides only a display name — not a user id — so the name-hash remains as a
fallback for users not yet in the cache.

---

## P2 — cleanup

### 9. `threadClosesOn` re-implemented `parseYmd`

Duplicated the exact `split('-').map(Number)` body of `parseYmd`, exported from
the module this file already imports from. **Fix:** call `parseYmd`.

### 10. Two `EmptyThread`s, and a redundant `closed` re-derivation

`inbox.tsx` declared a component named `EmptyThread` while
`stream-components.tsx` exports a *different* `EmptyThread` that is registered as
`EmptyStateIndicator` over that same subtree. Separately, `TourChatPanel`
recomputed `isThreadClosed(tour)` client-side although `ensureTourChannel`
already returns `closed`, which it discarded.

**Fix:** the inbox component is renamed `NoThreadSelected`; the `closed`
re-derivation disappears with finding 1, since the composer now reads the
server-set `frozen` flag.
