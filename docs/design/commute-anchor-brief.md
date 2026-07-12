# Design brief: Commute anchor — "distance to my place"

> Product brief for Claude Design (improvement #11). This describes **what
> the feature does and why**, the flow, and every state a design must
> cover. It deliberately avoids implementation detail and visual
> prescriptions — layout, hierarchy, component choices, and styling are
> Claude Design's call, within the app's existing flat design system.

## 1. The problem

Renters almost always optimize for **one place**: the office, a school,
the beach, a partner's apartment. The app knows where every listing is,
but nothing about where the renter's life is anchored — so on every
single card they mentally triangulate "how far is this from work?" and
often leave the app to check a maps site.

**The feature:** let the renter drop one pin on a map — "a place I care
about" — give it an optional short label ("Office"), and from then on
every listing they see tells them how far it is from that place. They
can also sort results by closeness to it.

## 2. Who it's for

- Renters browsing `/apartments`, saved homes, and listing detail pages.
- **Guests and signed-in renters alike** — setting an anchor must not
  require an account. (Signed-in renters keep it across devices; guests
  keep it on this device.)
- Owners never see anyone's anchor. It is private to the renter.

## 3. The flow

1. **Set it.** Somewhere in the browse experience the renter finds an
   affordance to set "a place I care about". It opens a small map where
   they drop/drag a pin, optionally type a short label, and confirm.
   No address search in v1 — pin-drop only.
2. **See it everywhere.** From that moment, every listing card gains a
   distance indication to the anchor, using the label if one was given
   (e.g. "2.1 km to Office", "800 m to Office"). The listing detail
   page's map shows both the listing and the anchor, so the spatial
   relationship is visible at a glance, and the detail page may
   additionally show an estimated travel time (see §5).
3. **Sort by it.** The sort menu gains a "closest" option (worded using
   the anchor's label where possible). Sorting by closeness should be
   shareable — someone opening a shared results link sees the same
   order.
4. **Change or remove it.** The anchor is editable (move the pin, rename
   the label) and removable from the same entry point. Removing it
   returns every surface to its pre-anchor state.

One anchor only in v1. Multiple anchors (office + gym) is a known later
refinement — the design shouldn't paint us into a corner, but shouldn't
build UI for it either.

## 4. Surfaces it touches

- **Browse `/apartments`** — the primary surface. Today: a filters
  panel, a sort dropdown (Featured / Newest / Price low·high / Area), a
  paginated card grid, and a "recently viewed" strip. The entry point
  for setting the anchor lives somewhere here; the cards gain the
  distance line; the sort menu gains the new option.
- **Listing cards everywhere they appear** — browse results, saved
  homes, recently viewed, similar listings. The card currently shows
  price, title, district, availability, and beds/baths/area. The
  distance line joins this set; where it sits and how loud it is, is a
  design decision.
- **Listing detail page** — the map gains the anchor pin alongside the
  listing pin; optionally a travel-time estimate near it.
- **Future surfaces (don't design, just don't block):** the planned map
  view on browse (improvement #1) would show the anchor as a distinct
  marker; the planned compare table (#10) would get a distance row.

## 5. What the numbers mean (product decision, fixed)

- Distances on **cards** are straight-line ("as the crow flies") —
  instant for a whole result page, and within one city they rank
  correctly even when the km value is approximate. The presentation
  shouldn't oversell precision (this is a design consideration: it's a
  scent, not a routing promise).
- The **detail page** is the only place that may show a real travel-time
  estimate ("~9 min by motorbike"). If the estimate can't be fetched,
  the page falls back to the straight-line distance without an error
  state in the renter's face.

## 6. States a design must cover

1. **No anchor set (default).** Cards and sort as they are today, plus
   the discoverable entry point. This is the state most users see
   forever — the entry point must invite without nagging.
2. **Setting the anchor.** Map pin-picker + optional label + confirm.
   Also reached later for editing (pre-filled pin and label).
3. **Anchor set.** Distance on every card, anchor visible on the detail
   map, "closest" available in sort, entry point now reflects the
   anchor (shows its label, offers edit/remove).
4. **Anchor set, no label.** Copy degrades gracefully ("2.1 km away" or
   similar — exact copy is open).
5. **Sorted by closest.** The active sort is visible as with existing
   sorts; if the anchor is then removed, the sort falls back sensibly.
6. **Listing without a precise location.** A card may have no usable
   coordinates — its distance line simply doesn't render; the card must
   not look broken next to siblings that have one.
7. **Guest → sign-in.** A guest's anchor keeps working after signing in;
   no re-entry, no duplicate prompts.

## 7. Privacy (fixed)

The anchor is likely someone's workplace or home. It never appears to
owners, is never attached to tour bookings, and is never included when a
listing is shared. The only exception: choosing the "closest" sort puts
the anchor's coordinates in the shareable results link — the design
should make it feel deliberate that sharing a sorted view shares the
place it's sorted around (or at minimum not hide it).

## 8. Fixed vs. free

**Fixed (product contracts):**

- One anchor, optional label, pin-drop only (no address/geocoding
  search) in v1.
- Works for guests; private to the renter (§7).
- Straight-line on cards, travel-time only on detail (§5).
- Distance appears on listing cards wherever cards render, not only on
  browse.
- "Closest" joins the existing sort options rather than replacing them.
- All copy localized (Vietnamese default + English), like the rest of
  the app.
- Existing flat design system: square corners, no shadows; round shapes
  are reserved for map markers.

**Free for Claude Design:**

- Where the entry point lives (filters panel, toolbar, banner, map…)
  and what it looks like in both the unset and set states.
- The set-a-place surface itself (dialog, sheet, inline…), and how
  label entry and confirm/remove are arranged.
- How the distance reads on cards — wording, icon, position, emphasis —
  and how it coexists with the card's existing lines on small widths.
- How the anchor is represented on maps (distinct from listing pins).
- How "closest to {label}" is worded in the sort menu, and what happens
  visually when the anchor is edited while that sort is active.
- All empty/edge presentations in §6.

## 9. Success looks like

A renter who cares about one destination can answer "how far is this
from my office?" for every listing **without leaving the card**, can
bring the closest homes to the top in one gesture, and never feels the
feature in the way when they haven't opted into it.
