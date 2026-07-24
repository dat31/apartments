# Messaging — empty channels accumulate server-side

> Written **2026-07-24** while building renter⇄owner messaging
> (branch `feat/renter-owner-chat`). The user-visible symptom is **fixed**
> (commit `68ff8c1`); the underlying accumulation is **not**, and is parked
> here deliberately. Nothing here is urgent — it is a housekeeping and
> abuse-surface question, not a correctness one.

## Symptom (fixed)

The `/messages` inbox listed conversations nobody had ever written in — a row
with an avatar, a listing title and a blank preview.

Measured on the live Stream app on 2026-07-24: **20 `messaging` channels, 6
carrying a `last_message_at`, 14 empty.** One account was a member of all 20,
so its inbox was 70% blank rows.

Re-measure any time with the server SDK (read-only):

```bash
pnpm exec dotenv -e .env.local -- node -e "
const { StreamChat } = require('stream-chat');
const c = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY, process.env.STREAM_API_SECRET);
c.queryChannels({ type: 'messaging' }, { last_message_at: -1 }, { limit: 100 })
 .then(cs => console.log('total', cs.length, '| with messages',
    cs.filter(ch => ch.data?.last_message_at).length));
"
```

## Why it happens

Channel creation is **eager**, and that is on purpose. Supabase is the
authority on who may talk to whom: `ensureTourChannel` /
`ensureListingChannel` read the RLS-scoped `tours` / `listings` row and only
then set channel membership. A client cannot be trusted to create a channel
with the right two members, so the channel exists before anyone has decided to
say anything.

Three paths create one:

| Path | Code | Leaves an empty channel when… |
|---|---|---|
| "Message owner" on a listing | `lib/actions/listing-chat.ts` | the renter taps it and backs out — the common case |
| Tour booked | `hooks/use-book-tour.ts` → `ensureTourChannel` | `tours.note` is empty, so there is no seed message |
| Tour card panel expanded | `components/messaging/tour-chat-panel.tsx` | the tour predates messaging and nobody writes |

The first is the volume driver: any signed-in user can open any listing, so the
ceiling is (listings × renters). This is the "channel-creation flood" the
implementation plan accepted for v1 — empty channels, never empty *messages*,
since sending still requires membership.

## What shipped instead

`components/messaging/inbox.tsx` filters the query:

```ts
{ type: CHANNEL_TYPE, members: { $in: [userId] }, last_message_at: { $exists: true } }
```

Server-side, not a client `.filter()`, so pagination stays honest. Two
behaviours this depends on, both verified against the installed SDK:

- `ChannelList`'s `allowNewMessagesFromUnfilteredChannels` defaults to `true`,
  so the first message sent or received moves the conversation into the list
  with no refetch. Hidden ≠ orphaned.
- The `?channel=` deep link is resolved by our own effect rather than
  `customActiveChannel`, whose handler opens with `if (!channels.length) return`
  — with the filter applied, a renter with no conversations tapping "Message
  owner" would otherwise land on the empty-inbox card instead of their thread.

So the inbox is correct today. The channels are simply invisible.

## What is still open

Empty channels keep accruing. Concretely that costs:

- **Dashboard noise** — channel counts stop meaning "conversations".
- **Plan limits** — worth checking what the Stream plan counts; if it bills or
  caps on channels rather than MAU, this becomes a real cost line.
- **A thin abuse surface** — a signed-in user can enumerate listings and mint a
  channel per listing. No message can be sent without membership, so the blast
  radius is rows in Stream, not spam.

## Options (not yet chosen)

1. **Leave it.** Cheapest. Defensible while volume is low; revisit if the count
   grows faster than real conversations. Pair with option 3 if it does.
2. **Defer creation to the first send.** The right fix in principle. `<Channel>`
   accepts a documented `doSendMessageRequest` prop, so the thread can render
   against a not-yet-created channel and, on the first send, call a server
   action that creates the channel (RLS-checked membership, as now) and posts
   the message in one step. Everything after that is unchanged. Main risks: the
   optimistic-send path and the error/retry states need care, and
   `tour-chat-panel` / `message-owner-button` currently expect a channel id back
   before they navigate.
3. **Scheduled cleanup.** A cron deleting `messaging` channels with no
   `last_message_at` older than N days, via the server SDK. Simple and additive
   — no client changes. Deletes channel state (members, read state), which is
   fine for a channel that never had a message. This is the cheapest way to
   bound growth without touching the send path.
4. **Raise the intent bar.** Only provision once the renter opens the thread
   *and* focuses the composer. Reduces volume without solving it; probably not
   worth the complexity on its own.

**Leaning:** 3 as a bounded stopgap, 2 when messaging next gets a work slot —
2 also closes the enumeration surface, which 3 only sweeps up after.

## Related

- `chat-implementation-plan.md` §12 "Open decisions" — where this was first
  accepted for v1.
- Commit `68ff8c1` — the inbox filter and the deep-link change.
