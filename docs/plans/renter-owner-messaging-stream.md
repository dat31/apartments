# Renter ⇄ owner messaging on Stream Chat — integration plan

Source material: [`docs/improvements/12-renter-owner-messaging.md`](../improvements/12-renter-owner-messaging.md)
and the Claude Design project
[apartment (Copy) - shadcn ui](https://claude.ai/design/p/6c642fad-9351-4009-bca4-88d8a5f71279),
file `messaging.jsx`.

Status: **implemented (v1)** — see [What shipped](#8-what-shipped). The design
decisions below were the input; §8 records what the code actually does and what
is deliberately still open.

---

## 1. The anchoring conflict (decide this first)

The two inputs disagree on what a conversation *is*, and it changes the Stream
channel model, the permission model, and the UI mount points.

| | Improvement doc #12 | Design `messaging.jsx` |
|---|---|---|
| Conversation anchor | the **tour** (`tour_id`) | the **listing** (`listingId::renterEmail`) |
| Who can start one | only a renter with a booked tour | any renter, from the listing page ("Message owner") |
| Lifetime | read-only after the tour date passes / is declined | open-ended |
| First message | the tour booking `note`, retrofitted | free-form |
| Abuse surface | bounded — appointment required | open cold-contact DMs |

The doc's reasoning for tour-anchoring is explicit and load-bearing: spam
containment, free context, and "it reuses the tour lifecycle as its permission
model, which RLS can express directly."

**Recommendation: tour-anchored** (follow the improvement doc). The design's
listing-anchored inbox is the more attractive UI but it discards the containment
argument, and re-adding blocking/reporting machinery in v1 is exactly what #12
says it is avoiding.

The design's *presentation* survives this choice unchanged — conversation list,
thread, day separators, unread badges, composer. Only the channel key and the
"start a conversation" entry point differ. That is the adaptation to make:
keep the design's layout, swap `listingId::renterEmail` for the tour id.

> Assumption applied for the rest of this document: **tour-anchored**.
> If the intent was the design's open messaging, sections 3 and 5 change.

---

## 2. Stream vs. the doc's Supabase design

#12 §"Integration points" specifies a `messages` table, RLS derived from
`tours`, Supabase Realtime, and a `useMessages(tourId)` TanStack query. Moving to
Stream Chat replaces all four:

| #12 plans | With Stream Chat |
|---|---|
| `messages` table + `schemas/message/` mirror | Stream holds messages; no app table |
| RLS from the `tours` row | server-minted token + channel membership set server-side |
| Supabase Realtime subscription | Stream's own websocket / `message.new` events |
| `useMessages(tourId)` TanStack query | Stream client channel state |
| Header unread badge (§5) | Stream's unread counts |

What does **not** move: the `tours` table stays the authority on *who may talk to
whom*. Stream never learns about tours; the server decides membership by reading
`tours` and only then adds the two users to the channel.

Consequence for §5 of the doc: the unread model no longer justifies a
`notifications` table — Stream supplies unread counts directly. #2's "derived
badge" gets replaced rather than upgraded.

---

## 3. Channel model

- One Stream channel per tour. Channel id derived from `tours.id`.
- Exactly two members: `tours.renter_id` and `tours.owner_id` — both are already
  `auth.users` ids, so **Supabase user id doubles as the Stream user id**. No
  identity mapping table needed.
- Custom channel data carries what the thread header needs so the UI never
  refetches: listing id, listing title, tour date/time, tour status.
- Read-only transition (#12 step 6) is a channel-level freeze, applied by the
  same server code that owns membership, driven off `tours.status` and
  `tours.date`.

The `note` / `reschedule` fields stay separate columns and render as inline
system events in the thread — this is #12's own recommendation and it holds
under Stream too (no data migration, full timeline readability).

---

## 4. Repo wiring points

Everything below is an existing file; the integration attaches at these seams.

**Identity / token**
- `hooks/auth/use-user.ts` — the signed-in user; source of the Stream user id.
- `lib/supabase/server.ts` — server-side session read for the token route.
- New: a server route that verifies the Supabase session and mints a Stream
  token for **that** user only. Never accepts a user id from the client.

**Tour data (membership authority)**
- `schemas/tour/index.ts` — `TourRequest`; `status` and `date` drive the freeze.
- `lib/services/tours-map.ts` — `toTourRequest`, row → domain.
- `hooks/use-book-tour.ts` — tour creation. The channel is provisioned here, and
  the booking `note` becomes the first message (#12 step 1).
- `supabase/migrations/20260718120000_tour_owner_id_integrity.sql` — the
  `set_tour_owner_id` trigger already guarantees `owner_id` is derived from the
  listing server-side, so it is trustworthy as a channel member.

**Renter mount point** (#12 step 2)
- `app/[lang]/(app)/tour/components/renter-tour-card.tsx` — gains the Messages
  affordance; expands inline, matching `tour-day-route.tsx`'s inline pattern.
- `hooks/use-my-tours.ts` — the tour list the cards render from.

**Owner mount point** (#12 step 3)
- `app/[lang]/(app)/owner/dashboard/components/owner-tour-card.tsx`
- `app/[lang]/(app)/owner/dashboard/tours/page.tsx`
- `hooks/use-owner-tours.ts`

**Shared thread component** — one component, two mount points, per #12
§"Integration points". Port from the design's `Thread` / `ConversationRow` /
`MessageBubble` in `messaging.jsx`.

**i18n** — every string localized (vi default + en) per
`docs/i18n-handoff.md` and the `i18n-translation` skill. The design's copy is
English-only and needs vi counterparts. Relative timestamps (`relTime`,
`dayLabel`, `clockTime` in the design) must go through the repo's locale-aware
formatting rather than bare `toLocaleDateString()`.

---

## 5. Client-component boundary

The repo is server-first (`server-first-rendering` skill; see the recent
landing-page refactors). Stream Chat is inherently client-side and websocket-
driven, so the thread is a genuine client island. Keep it minimal:

- Server component fetches the tour + listing context and renders the shell.
- Client island: the Stream client connection, message list, composer.
- The tour list pages stay server-rendered; only the expanded thread hydrates.

---

## 6. Setup that was run

```bash
getstream init   # org/app + credentials → .stream/creds.yaml (gitignored)
getstream env    # NEXT_PUBLIC_STREAM_API_KEY + STREAM_API_SECRET → .env.local
```

Packages: `pnpm add stream-chat stream-chat-react` — **pnpm, not npm**. The
Stream pack's rules say "always npm + `--legacy-peer-deps`", but its Track E
rule ("preserve the existing project's package manager") wins for an existing
repo; npm here would create a second lockfile. Resolved to
`stream-chat@9.50.2` + `stream-chat-react@14.9.0` (v14 — `MessageComposer`,
not `MessageInput`).

Both packages declare a `postinstall` that only runs a husky installer shipped
in their repo, not in the published tarball. `pnpm-workspace.yaml` records them
as `allowBuilds: false` rather than leaving pnpm's unapproved-builds prompt to
fail every subsequent `pnpm` command.

---

## 7. Channel-type config

`messaging` is used as-is — no `CreateChannelType` / `UpdateChannelType` call
was made. Its relevant defaults, read back with
`getstream api chat GetChannelType --name messaging`:

| Flag | Value | Matters because |
|---|---|---|
| `read_events` | `true` | unread counts work — the card badges depend on it |
| `typing_events` | `true` | typing indicator available |
| `reactions` | `true` | prebuilt reaction UI is live |
| `replies` | `true` | threaded replies available |
| `uploads` | `true` | **attachment button is visible** — see §8 open items |
| `polls` | `false` | default; unused |

---

## 8. What shipped

**New**
- `lib/stream/tour-thread.ts` — channel id derivation + the read-only cutoff
  (`isThreadClosed`). Pure, runs on both sides.
- `lib/stream/custom-data.ts` — module augmentation for the custom channel
  fields (`tour_id`, `listing_id`, `listing_title`, `tour_date`, `tour_time`).
- `lib/stream/server.ts` — `server-only` StreamChat singleton.
- `app/api/stream/token/route.ts` — mints a token for the **caller only**; the
  Supabase session cookie is the sole identity input, so there is no `user_id`
  parameter to forge. Upserts only the requesting user.
- `lib/actions/tour-chat.ts` — `ensureTourChannel(tourId)`. The permission
  model: reads the `tours` row (RLS already restricts it to the two parties),
  sets membership from `renter_id` / `owner_id`, seeds the booking note as the
  first message, and freezes/unfreezes per §1's cutoff. Idempotent.
- `components/tour-chat/` — `tour-chat-provider.tsx` (one hoisted `<Chat>` per
  page + unread-per-tour tracking), `tour-chat-thread.tsx` (prebuilt
  `<Channel>/<Window>/<MessageList>/<MessageComposer>`), `tour-chat-panel.tsx`
  (the inline-expanding "Messages" affordance with unread badge).

**Modified** — `renter-tour-card.tsx`, `renter-tours.tsx`,
`owner-tour-card.tsx`, `owner-tours.tsx` (mount points + provider),
`messages/{vi,en}.json` (`tourChat` namespace).

**Verified** — `pnpm run typecheck` clean, `pnpm build` clean, `eslint` clean on
all new/changed files, `/api/stream/token` returns 401 unauthenticated, `/vi/tour`
still redirects to signin, Stream credentials resolve against the live app.

**Not verified** — no end-to-end message send. `/tour` and `/owner/dashboard`
are auth-gated and driving them needs credentials (`docs/plans/tour-route-planner.md`
§6 / the `verify` skill both call this out). Two signed-in browser sessions are
the only way to exercise a real exchange.

### Open items

1. **Attachments are reachable.** #12 scopes v1 to plain text, but `uploads` is
   `true` on the `messaging` type so the prebuilt composer shows an attachment
   button. Closing it is a channel-type config change
   (`UpdateChannelType --name messaging --request '{"uploads": false}'`) that
   affects the whole Stream app, so it was left alone pending a decision.
   Hiding it client-side instead would mean replacing the prebuilt composer,
   which pulls in the full custom-UI completion contract — not worth it.
2. **Visual match to the design is not done.** The thread uses Stream's stock
   `str-chat` look, themed light/dark off `next-themes`. The design's bespoke
   bubble/day-separator/conversation-list styling is a separate pass and should
   go through Stream's theming variables, not ad-hoc CSS.
3. **The header unread badge (#12 step 5) is not wired.** Per-card badges work;
   feeding the app header means surfacing `unreadByTour` above the tour pages.
4. **No email nudge** (#12's "New message about your tour") — depends on #2's
   email provider.
5. **`tours.note` still double-renders** on the owner card: once as the card's
   note block, once as the thread's first message. #12 recommends keeping them
   separate and rendering system events inline; worth revisiting.
