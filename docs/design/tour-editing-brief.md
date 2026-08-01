# Design brief: the 360° tour editor

> For Claude Design, which has this project synced — so this brief covers only
> what the code cannot tell you: what this page has to let a host do, the flow
> through it, and the rules behind it. The product, the renter's tour, the
> host's other surfaces and the existing components are all there to read.
>
> It is a **product brief, not a handoff**: no layout, no components, no
> technical requirements. What to build, not how.
>
> One page: **the editor a host uses to build the 360° tour of one home.** A
> partial version exists at `/apartments/[id]/virtual-tour/edit`. Treat it as
> one answer, not the answer.

---

## 1. The job

Every 360° tour in the product today is the same five demonstration rooms. No
host has ever made one, because there is no finished way to.

Making a tour is real work: shoot each room, decide the order a stranger meets
them in, mark where the doorways are, decide what is worth pointing out. A host
who gives up halfway leaves a home looking worse than one with no tour at all.

So the job of this page is to get a non-technical person, usually holding a
phone, from *"I have some photos of my flat"* to *"my tour is live and it is
honest"* — without help, and without abandoning it. A host is typically an
individual with one to three properties, not an agency with staff.

## 2. The flow it has to carry

**Nothing yet → rooms in → shape them → connect them → check it → live.**

Not in one sitting. A host will add two rooms, run out of time, and come back
hours later. Whatever they did must still be there, and where they are in the
flow must be obvious the moment they return.

The steps are not strictly ordered — a host may name a room, publish, then come
back and add doors a week later — but "nothing yet" and "live" are the two ends
that matter.

## 3. What a host must be able to do

Capabilities, not layout. How these are arranged, revealed, sequenced or
combined is open.

**Get photos in**
- Add a room from a 360° photo, one or several at a time.
- Understand, when a photo is refused, *why*, and what would work instead. The
  most common mistake by far is an ordinary photo. This rejection is a teaching
  moment, not an error message.
- Understand *before starting* what kind of photo is needed and where to get
  one. Most hosts have never heard the word "equirectangular" and shouldn't
  have to; many can shoot one with a free phone app, some own a 360 camera. A
  host who cannot produce one cannot use this page at all.
- Know a large photo is being processed rather than that the app has frozen —
  on a phone, on mobile data, right after shooting.

**Shape the tour**
- Name each room, in their own words.
- Say what kind of room it is.
- Reorder rooms — this is the order a renter meets them in.
- Remove a room.
- Choose which room the tour opens in, and the direction and how wide a view
  the renter arrives on, by looking around until it is framed right. A tour
  that opens facing a blank wall wastes its best moment.

**Connect the rooms**
- Place a door on an actual doorway in the photograph, and say which room it
  leads to.
- Place a point of interest on a specific thing and write a sentence or two
  about it ("east-facing balcony, morning sun").
- Move a marker that ended up in the wrong place; edit what it says; remove it.
- Do this accurately on a phone as well as with a mouse. This is the hardest
  interaction on the page: the host is aiming at a point inside a photograph
  they can also drag around.
- Do it without a pointer at all. Pointing at a spot is the obvious gesture and
  cannot be the only one — a host on a keyboard or screen reader has to be able
  to add, reach, change and remove every marker. This constrains what a marker
  can be.
- See which rooms already connect to which, without opening every room to find
  out.

**Decide it's ready**
- See the tour exactly as a renter will, before anyone else does.
- Know at a glance what state it is in: nothing yet, draft, or live.
- Know what — if anything — is stopping them publishing, in a sentence they can
  act on.
- Publish, and take it down again.

## 4. The logic behind it

The part that isn't visible in the code, and the part most likely to be got
wrong.

**Renters only ever see finished tours.** A home either has a tour that can be
walked end to end, or none. The page has to hold unfinished work somewhere
renters can't see it.

**Not every problem is a blocker.** Two things are genuinely broken and must
stop publication: a tour with no rooms, and a door leading to a room that no
longer exists. One thing looks broken and isn't: **a room with no door leading
to it is fine.** A renter can always jump straight to any room from the list of
rooms, so they are never stranded. A host with four rooms and no doors yet has
a publishable tour — and telling them otherwise would block the first tour
anyone ever builds. The page must separate "this is broken" from "you might
want to know" without the second reading as failure.

**Removing a room can break a different room.** If a door led to the room just
deleted, that door is now broken — somewhere the host isn't looking. This must
never become an invisible problem discovered later at publish time.

**A room's name travels with the doors that lead to it.** A door is labelled
with the room on the other side. Rename "Bedroom" to "Master bedroom" and every
door leading there should say so; the host should not have to correct the same
name in three other rooms.

**A door is placed in one room, not two.** Marking the doorway from the living
room into the kitchen does not by itself give the kitchen a door back. Whether
the page offers the return door, creates it silently, or leaves it to the host
is open (§7) — but a host who places one door and expects two must not end up
with a tour that behaves oddly for reasons they can't see.

**The host's words are the host's.** Room names and point-of-interest text are
written by the host in whatever language they write, and are never translated.
Everything else on the page exists in Vietnamese and English.

**"Tour" is already taken.** In English it means the in-person viewing
appointment everywhere else in the product; this is always the "360° tour". In
Vietnamese the two are *"Lịch xem nhà"* and *"Tham quan 360°"*, so the collision
is English-only — but a host can be looking at their viewing requests and their
360° tour in the same session.

**Honesty is the point.** The renter-facing promise is that a tour shows the
actual unit as it actually looks. Nothing here should encourage flattery.

## 5. States that need designing

- **Nothing yet.** The most important state on the page: it decides whether the
  host starts at all.
- **A photo was refused**, and why.
- **A photo is being processed** — potentially slow, on a phone.
- **Some rooms, no doors** — a real, publishable, common state.
- **Draft with work in progress** — the host left and came back.
- **Something is blocking publication** — expressed as what to do, not what is
  wrong.
- **Live** — including what editing a live tour means, when renters are looking
  at it right now.
- **A room was removed** and doors elsewhere pointed at it.
- **A room was renamed** after doors already led to it.
- **Two markers almost on top of each other** — nothing stops a host placing
  them there, and both still have to be selectable.
- **Taking a live tour down.**

## 6. Context of use

- **Phone is likely, and awkward.** The host just shot the rooms on their
  phone, so that is where the photos are. Placing a marker precisely inside a
  draggable photograph on a small screen is the central difficulty.
- **Desktop** gives a pointer and room to work; a host with several properties
  will probably prefer it.
- Either way, expect interruption and return.

Success looks like: a host who starts finishes, unaided; published tours are
complete and honest; hosts write points of interest rather than only adding
rooms; few tours sit abandoned as drafts.

## 7. Questions worth an opinion from design

1. **Is a room a card in a list, or a place you go into?** Naming and ordering
   suit a list; framing the opening view and placing doors mean being inside
   the room. Those may be two surfaces, or one that opens up.
2. **How does a host place a marker on a phone** without fighting the drag they
   use to look around? Tap-to-place, aim-a-crosshair-and-confirm, and
   place-then-nudge all feel very different.
3. **How does a door say where it goes** while it is being placed — and how
   does the host confirm they got the right doorway?
4. **When a host places a door, should the way back appear automatically?**
   Doing it silently is convenient and occasionally wrong: the return doorway
   is rarely at the mirrored spot, and a one-way route through a hallway is
   legitimate. Offering it costs a step.
5. **Should editing a live tour affect renters immediately**, or should changes
   be staged and re-published? Immediate is simpler and riskier.
6. **How much should the empty state teach?** A host who cannot produce a 360°
   photo cannot use this page at all — so it may be doing more product work
   than anything else here. But nobody reads a tutorial.
7. **Is "draft" the right idea**, or should a tour simply be hidden until the
   host says otherwise? The distinction has to be obvious to someone who has
   never used the word.

## 8. Out of scope

The renter's tour (built), VR, floor plans, bulk tools for hosts with many
properties, and analytics on how far renters got.
