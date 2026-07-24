# Messaging — empty channels accumulate server-side

> Written **2026-07-24** while building renter⇄owner messaging
> (branch `feat/renter-owner-chat`). The user-visible symptom is **fixed**
> (commit `68ff8c1`); the underlying accumulation is **not**. This document
> only describes the issue — it deliberately proposes no fix. Nothing here is
> a correctness bug; it is a housekeeping / cost / abuse-surface question to
> weigh later.

## Symptom (fixed)

The `/messages` inbox listed conversations nobody had ever written in — a row
with an avatar, a listing title, and a blank message preview where the last
message would go.

Measured on the live Stream app on 2026-07-24: **20 `messaging` channels, 6
carrying a `last_message_at`, 14 empty.** One account was a member of all 20,
so its inbox was ~70% blank rows.

Re-measure any time with the server SDK (read-only, no writes):

```bash
pnpm exec dotenv -e .env.local -- node -e "
const { StreamChat } = require('stream-chat');
const c = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY, process.env.STREAM_API_SECRET);
c.queryChannels({ type: 'messaging' }, { last_message_at: -1 }, { limit: 100 })
 .then(cs => console.log('total', cs.length, '| with messages',
    cs.filter(ch => ch.data?.last_message_at).length));
"
```

## Mechanism — why an empty channel exists at all

A Stream channel is created **before** any message is sent, and that ordering
is deliberate, not incidental.

Supabase — not the browser — is the authority on who may talk to whom. The two
server actions that provision a channel (`lib/actions/tour-chat.ts` →
`ensureTourChannel`, `lib/actions/listing-chat.ts` → `ensureListingChannel`)
each:

1. read the RLS-scoped `tours` / `listings` row for the signed-in caller, so a
   forged id returns nothing;
2. derive the two members from that row (renter + owner) — never from client
   input;
3. call `streamServer().channel(CHANNEL_TYPE, channelId, { members, … }).create()`.

Because membership is the security boundary and only the server can set it
correctly, the channel has to come into existence at the moment the *intent to
maybe talk* appears — which is earlier than the *first message*. A channel with
two members and zero messages is the normal resting state of that gap, not an
error.

`channel.create()` is also idempotent for a fixed channel id (tour id, or a
`sha256(listingId:renterId)` hash for listing threads), so re-opening the same
pairing returns the same channel rather than making a new one. That bounds
duplicates per pairing but does nothing to prevent the *first* empty channel
per pairing.

## The three creation paths

| Path | Entry point | Server action | Becomes an empty channel when… |
|---|---|---|---|
| **"Message owner" on a listing** | `components/messaging/message-owner-button.tsx` → `router.push('/messages?channel=…')` | `ensureListingChannel` | the renter taps the button, is navigated into the thread, then leaves without sending. |
| **Tour booked** | `hooks/use-book-tour.ts` (fire-and-forget after insert) | `ensureTourChannel` | `tours.note` is empty, so there is no booking note to seed as the first message. |
| **Tour card panel expanded** | `components/messaging/tour-chat-panel.tsx` (lazy, on expand) | `ensureTourChannel` | a tour booked before messaging shipped is opened, provisioning the channel, and nobody writes. |

The first path is the volume driver. "Message owner" is on every listing detail
page and is reachable by **any** signed-in renter, so the number of empty
channels this path can create scales with **(listings seen × renters)** — a far
larger surface than tours, which require a booking. The tour paths only add a
channel per real booking, and most of those carry a seed note (the booking
`note` becomes the thread's first message), so most tour channels are *not*
empty.

This is the "channel-creation flood" the implementation plan explicitly
accepted for v1 (`chat-implementation-plan.md` §12, "Open decisions"). The
containment it relied on: creating a channel is not the same as sending a
message — **sending still requires membership**, which only ever holds the two
real parties — so the flood is empty *channels*, never empty inboxes full of
unsolicited *messages*.

## Current inbox behaviour (why the symptom is gone but the channels aren't)

`components/messaging/inbox.tsx` filters the channel-list query so empty
channels are not listed:

```ts
{ type: CHANNEL_TYPE, members: { $in: [userId] }, last_message_at: { $exists: true } }
```

The filter is applied **server-side** (in the `queryChannels` filter, not a
client-side `.filter()` over the results), so the count and pagination stay
consistent — a client filter would render, say, 6 of a fetched page of 20 and
mislead "load more".

Two SDK behaviours make the filter safe rather than lossy — both were verified
against the installed `stream-chat-react` source, not assumed:

- `ChannelList`'s `allowNewMessagesFromUnfilteredChannels` defaults to `true`,
  so the instant the first message is sent or received the channel moves into
  the list on its own, with no refetch. **Hidden is not orphaned.**
- The `?channel=…` deep link (used by "Message owner" and the listing chip) is
  resolved by an effect in `inbox.tsx` rather than `ChannelList`'s
  `customActiveChannel` prop, whose handler opens with
  `if (!channels.length) return`. With the filter applied, a renter who has no
  conversations yet and taps "Message owner" would otherwise land on the
  empty-inbox card instead of the thread they just opened.

Net effect: the inbox is correct, but the empty channels still exist in Stream
— they are simply not queried. Every count above (20 total, 14 empty) is what
the *unfiltered* server-side query returns and is unaffected by the inbox fix.

## What "still open" means, concretely

Empty channels keep accruing over time, one per (listing, renter) pairing that
was opened but never written in. That is not a correctness problem — no user
sees them, no message leaks — but it has three downstream consequences worth
weighing:

- **Dashboard / metrics noise.** A raw `messaging` channel count no longer
  approximates "conversations that happened"; anything reading channel counts
  (Stream dashboard, future analytics) is inflated by the empty ones.
- **Plan accounting.** Whether this matters depends on what the Stream plan
  meters. If billing / limits are keyed on MAU it is irrelevant; if they are
  keyed on channel count it is a slow-growing cost line. This has **not** been
  checked and is the single most useful thing to confirm before deciding the
  issue's priority.
- **A thin enumeration surface.** A signed-in renter can walk every listing and
  provision a channel for each, with no rate limit beyond normal request
  throughput. The blast radius is bounded: no channel they create can carry a
  message to the owner without membership, so this produces *rows in Stream*,
  not spam or notifications. It is a tidiness/quota concern, not a safety one.

## Reproduction

1. Sign in as a renter.
2. Open any listing detail page and click **"Message owner"** (VN: "Nhắn chủ
   nhà"). You are navigated to `/messages?channel=<hash>`; the thread opens.
3. Navigate away without sending anything.
4. Server-side, the channel now exists with two members and zero messages. Run
   the re-measure snippet above: `total` increments, `with messages` does not.
5. In the inbox itself the row does **not** appear (the `$exists` filter) — the
   accumulation is only visible via the server query.

## Related

- `chat-implementation-plan.md` §12 "Open decisions" — where the empty-channel
  flood was first named and accepted for v1.
- Commit `68ff8c1` — the inbox `last_message_at` filter and the deep-link
  handling change described under "Current inbox behaviour".
- `lib/actions/tour-chat.ts`, `lib/actions/listing-chat.ts` — the two
  provisioning actions.
