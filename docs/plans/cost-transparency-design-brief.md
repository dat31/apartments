# Design brief: Cost transparency (improvement #13)

> Handoff for Claude Design. This describes **what to build and why** — the
> visual and layout decisions are yours. Written 2026-07-16 from
> `docs/improvements/13-cost-transparency.md`.

## The product

A long-term apartment rental app for Da Nang, Vietnam. Renters browse
listings, view a detail page, save favorites, and book in-person tours.
Owners create and manage their own listings through a form. The UI ships in
Vietnamese (default) and English, works on mobile and desktop, and has
light and dark themes.

## The problem

A listing today shows exactly one number: monthly rent. But the questions
every Da Nang renter actually asks before touring — *How much is the
deposit? Are electricity and water included? What's the minimum lease?* —
have no home anywhere in the app. Renters either message the owner off-app
or show up to a tour and get surprised. Owners who *are* upfront about
costs have no way to say so.

We want listings to answer those questions at a glance, and to give renters
the one number they actually budget against: **estimated move-in cost**
(first month's rent + deposit). Almost no listing site surfaces this, and
it's the real payoff of the feature.

## What to design

Two surfaces, one for each side of the marketplace.

### 1. Renter side — a "Costs" section on the listing detail page

The detail page currently has: photo gallery on top, then a main column
(title, key facts like beds/baths/area, description, amenities, map,
reviews) alongside a sticky sidebar card with the monthly price, an
availability line, and the "Book a tour" / "Save" buttons. On mobile the
sidebar is replaced by a sticky bottom bar with price + book button.

Design a costs presentation that:

- Shows **deposit**, **utilities** (electricity, water, wifi, building
  fee — each one is either included in rent, metered by usage, or a fixed
  monthly amount), and **minimum lease length**.
- Makes the **estimated move-in cost** the hero of the section — e.g.
  "Move in from ~₫28,000,000". It's a derived, approximate number, and the
  design should communicate both that it matters and that it's an estimate.
- Sits close to the price and the book-tour action, because cost questions
  and booking intent happen at the same moment. Whether it lives in the
  sidebar card, the main column, or both is your call — but it must work
  on mobile too, where there is no sidebar.
- Degrades gracefully when data is partial or absent. Most existing
  listings will have **none** of this information at launch, and owners
  fill in only what they know. Decide how a listing with, say, only a
  deposit should read — and whether a listing with no cost info shows
  anything at all. "Unknown" must never look like "free".

### 2. Owner side — a "Costs & terms" section in the listing form

The create/edit listing form is a single page of stacked card sections:
Photos, Basics (title, type, price, beds, baths, area, district,
availability, description), Location (map pin), Amenities, then the
publish footer. Add a **Costs & terms** section that fits this rhythm.

The owner needs to express:

- **Deposit** — the common cases are "1 month", "2 months", a custom
  amount, or "no deposit". Make the common cases one tap.
- **Utilities** — for each of electricity, water, wifi, building fee:
  included / metered / fixed amount (with the amount when fixed).
- **Minimum lease** — in months.

Every field is optional, and the section should feel that way — an owner
who skips it entirely must not feel like their listing is incomplete or be
nagged. At the same time, the design can gently make the case for filling
it in (renters trust listings that answer the money questions).

## Worth exploring (optional, not required)

- A subtle **"transparent pricing"** signal on listings whose cost info is
  complete — the incentive for owners to fill the section in. If you design
  it, keep it quiet; it must not read as a paid badge or verification mark.
- A tiny deposit hint on browse-grid listing cards (e.g. "deposit: 1 mo").
  Detail page comes first; only add this if it earns its clutter.

## Out of scope

- No payment processing, escrow, or checkout of any kind — this is purely
  information display.
- No search filters on cost fields ("no deposit", "utilities included").
  That's a natural follow-up once the data exists, but not this design.
- Don't fold costs into the amenities checklist — these are structured
  facts with values, not on/off tags.

## Context that shapes the design

- **Currency:** amounts are Vietnamese đồng — large numbers
  (₫5,000,000-scale rents). The app already formats money consistently;
  just design for wide numbers.
- **Both languages:** Vietnamese labels tend to run longer than English.
- **Themes:** must read well in light and dark.
- **Tone of the app:** clean, card-based, generous spacing, minimal
  ornament. Icons are used sparingly to anchor facts (beds, baths, area
  get icon + label chips).
