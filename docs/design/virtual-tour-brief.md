# Design brief: 360° virtual home tour

> For Claude Design. This is a **product brief, not a handoff**: it says what
> the feature has to do, who it serves, how a renter moves through it, and the
> rules it must respect. It deliberately does not describe layout, components,
> or how any of it should look — those are the design decisions this brief
> exists to inform.
>
> A working version of this feature already ships in the app. Treat it as one
> answer, not the answer; nothing here is a description of it. The engineering
> plan (`docs/plans/virtual-home-tour.md`) is the technical counterpart and is
> not needed to design against this brief.

---

## 1. The product this belongs to

**Danapa** — apartment renting in Da Nang, Vietnam. Two roles use it:

- **Renters** browse homes, shortlist them, book a viewing appointment with
  the host, attend it, and message the host. Most are on a phone.
- **Hosts** (owners) list their homes, manage availability, and confirm or
  reschedule viewing requests.

Vietnamese is the primary language and the default; English is secondary.
Every renter-facing surface exists in both.

The journey today runs: **land → browse → listing detail → book a viewing →
attend → decide**. Booking a viewing is the product's central conversion.

## 2. The problem

A renter deciding whether to spend an hour crossing Da Nang for a viewing has
only a handful of photos to go on. Photos are chosen by the host, shot at
flattering angles, and say nothing about how rooms connect, how big a room
really feels, or what you see out of the window. So renters either book
viewings they regret, or skip homes they would have liked.

## 3. What the feature is

A home can have a **360° tour**: a small set of rooms, each one a spherical
photograph the renter stands in the middle of and looks around. Two things sit
on top of the photographs:

- **Doors** — the way to walk from one room to the next, placed where the real
  opening is in the photo.
- **Points of interest** — a marker on something worth calling out, with a
  sentence or two from the host ("east-facing balcony, morning sun", "comes
  with the fridge and gas hob").

The tour's job is to answer *"is this home worth a real visit?"* — it is a
better preview, never a replacement for the viewing. Every path through it
should still end at booking one.

## 4. A naming rule that cannot bend

**"Tour" already means an in-person viewing appointment in this product.**
The renter's appointments page, the "book a tour" action, and the host's
request queue all use it. In Vietnamese that concept is *"Lịch xem nhà"*
(viewing appointment), so the collision is English-only — but it is severe,
because both concepts appear on the same screen.

| | In-person appointment (existing) | This feature (new) |
| --- | --- | --- |
| English | "Book a tour", "My tours" | "360° tour", "Virtual tour" |
| Vietnamese | "Lịch xem nhà", "Đặt lịch xem" | "Tham quan 360°" |

A renter must never have to guess which of the two a control means. Where both
appear together, the difference has to be obvious at a glance — and the 360°
one should read as the *earlier, cheaper* step of the two.

## 5. Who sees an entry point, and where

Only some homes have a tour. That shapes every surface it touches:

- **Wherever homes are listed** (browse results, saved homes, anywhere a home
  appears as a card), a home with a tour needs an honest, glanceable signal
  that it has one. A home without one shows nothing extra — no empty slot, no
  "no tour available".
- **On the listing itself**, the tour needs a way in that sits naturally with
  the photos, and a second one near the booking decision, positioned so it
  reads as the step you take *before* booking a viewing.
- The signal must never overstate what's inside: a renter who opens a tour
  expecting a walkthrough of the whole home and finds two rooms will trust the
  next one less.

## 6. What a renter must be able to do inside a tour

Capabilities, not layout. Everything below has to be possible; how it is
arranged, revealed, or combined is open.

**Look**
- Look freely in any direction, and get closer or further from what they're
  looking at.
- Understand immediately that the image can be looked around — a first-time
  visitor should not have to discover this by accident.

**Move**
- Walk into an adjoining room by taking a door they can see in the photo.
- Reach *any* room directly, without hunting for doors — a renter must never
  be stuck in a room or forced to retrace steps.
- Always know which room they are in, and how many rooms the tour has.
- Room names come from the host and describe the real room ("Bedroom",
  "Kitchen & dining", "Balcony").

**Learn**
- Open a point of interest and read it *without losing the room* — reading
  about the balcony should not take the balcony off screen.
- See the home's essentials while touring, not only after leaving: price per
  month, availability, size, bedrooms and bathrooms, and the estimated
  move-in cost. This is the information that decides whether they book.

**Act**
- Book a viewing, save the home, or message the host from inside the tour,
  without having to find their way back to the listing first.
- Return to the listing deliberately and obviously when they're done.

**Share**
- Send someone a link that opens the tour *at a specific room* — sharing a
  home with a partner or parent is a normal part of renting here.

## 7. Rules the design has to respect

**Content vs. interface.** Room names and point-of-interest text are written
by the host, in whatever language they write. They are content and are never
translated. Everything else — labels, actions, empty and error text — exists
in Vietnamese and English.

**The tour never closes the sale.** However good it is, the renter still has
to see the home in person. The experience should carry a quiet reminder of
that, and should always leave booking one gesture away.

**Only complete tours are shown.** A home either has a finished tour a renter
can walk through end to end, or it has none. Half-built tours, rooms that lead
nowhere, and rooms that can't be reached are not states a renter should ever
meet.

**Hosts see their own homes too.** A host opening their own listing's tour
should be able to walk it, but actions that make no sense on your own home
(booking a viewing with yourself, messaging yourself) don't apply to them.

**Size varies.** A studio may have two or three rooms; a family home five or
six. Both extremes must feel deliberate — not a rail with one lonely item, and
not an overflowing list.

**Trust is the point.** Everything about the presentation should reinforce
that this is the actual unit as it actually looks. Nothing should feel like a
render, a stock photo, or a marketing device.

## 8. States that need a design

- **Arriving** — the first moments while the room is still loading. On a
  mid-range phone over mobile data this is a real wait, and a rough version of
  the room can be shown before the sharp one.
- **Moving between rooms** — walking through a door takes a beat; it should
  feel like movement rather than a slideshow.
- **A room won't load** — the renter keeps what they were looking at and is
  told plainly which room failed.
- **The device can't show it** — some browsers and devices cannot render this
  kind of image at all. Those renters still need to understand what the home
  looks like and still need every action the listing offers.
- **This home has no tour** — the listing behaves exactly as it does today.
- **Someone opens a shared link to a room that no longer exists** — they land
  somewhere sensible rather than in an error.
- **Reduced motion** — a renter who has asked their device for less motion
  gets the same tour without the movement.
- **Keyboard and screen reader** — every door and every point of interest is
  reachable and understandable without a pointer or sight. This is a
  requirement, not a nice-to-have: it constrains how markers can work.

## 9. Devices and context of use

- **Phone** is the majority case for renters here: portrait, one hand, often
  on mobile data, often outdoors in bright sun. Looking around must not fight
  with scrolling the page.
- **Tablet** and **desktop** get more room and a pointer; a desktop renter is
  more likely to be comparing several homes at once.
- **Headsets** are a later phase and out of scope for this pass, but the
  experience shouldn't be designed in a way that forecloses it.

## 10. What success looks like

- More renters who open a tour go on to book a viewing than renters who never
  saw one.
- Renters who open a tour look at more than one room — a tour that gets opened
  and abandoned in the first room has failed at its job.
- Fewer viewings that end in "this isn't what I expected".
- Hosts with tours get better-qualified visits, not just more of them.

## 11. Out of scope for this pass

- **How hosts create tours** — uploading rooms, naming them, placing doors and
  points of interest. That is its own design problem and comes later.
- **Headset / VR experience.**
- **A floor-plan map of the home** — appealing, but it depends on hosts having
  a floor plan image, which most do not.
- **Filtering the browse results down to homes with a tour** — likely valuable,
  but a separate decision.

## 12. Questions worth an opinion from design

1. Should the tour be **its own page** or a **full-screen layer** over the
   listing? Sharing a room by link and returning cleanly both matter; so does
   not making the renter feel they've left the home they were reading about.
2. **How much of the listing** should travel with the renter into the tour?
   Enough to decide, without turning the tour into a second listing page.
3. Should a listing that *has* a tour lead with it, or keep photos first and
   let the tour be an opt-in? Photos are familiar; the tour is better.
4. How should a **point of interest** announce itself before it's opened —
   how much can a marker say without cluttering a photograph?
5. During rollout, some tours will be **demonstration content** rather than
   the real unit. Is that a state worth marking, or one worth never shipping?
