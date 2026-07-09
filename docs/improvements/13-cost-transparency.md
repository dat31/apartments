# 13. Cost transparency — deposit, utilities, lease terms

**Impact: medium-high trust win, effort: small-medium (schema touch).** The
listing shows one number: monthly price. The questions every Da Nang renter
actually asks before touring — deposit? electricity/water included? minimum
lease? — have no home in the data, so today they can't even be *asked*
in-app (see #12), let alone answered up front.

## The flow

### Owner side (data entry)

1. The listing create/edit form gains a **"Costs & terms"** section:
   - deposit (common presets: 1 month / 2 months / custom amount / none)
   - utilities: electricity, water, wifi, building fee — each
     included / metered / fixed-amount
   - minimum lease (months)
2. All fields optional — existing listings stay valid, owners fill in what
   they know. Listings with complete cost info could later earn a subtle
   "transparent pricing" tag as the incentive.

### Renter side (display)

1. Detail page: a **"Costs"** block near the price — rent, deposit,
   utilities lines, minimum lease. The at-a-glance version of the awkward
   first-contact questions.
2. The real payoff line: **estimated move-in cost** = first month + deposit
   ("Move in from ~$4,760"). This single derived number is what renters
   budget against and almost no listing site surfaces it.
3. Listing cards can show a tiny "deposit: 1 mo" hint later — detail page
   first, cards only if it earns its clutter.

## Integration points

- **Schema:** new nullable columns on `listings` (Supabase migration) +
  fields on the domain `Listing` and `ListingCore` in `schemas/listing`,
  mapped in `lib/services/listings-map.ts`. Follow the existing optional
  `lat`/`lng` precedent for absent-on-legacy-rows handling.
- **Form:** `apartments/components/listing-form.tsx` +
  `createListingFormSchema` (strings-while-editing convention, converted in
  `formToCore`) — the deposit preset/custom split mirrors nothing existing,
  keep it a simple select + conditional input.
- **Display:** `detail-view.tsx` sidebar (near the book-tour CTA is the
  natural spot — cost questions and booking intent co-occur);
  `use-money.ts` for all currency rendering.
- **Seed data:** give the seed listings in `lib/data/listings.ts` plausible
  values so the UI never demos empty.
- **i18n:** `listingForm.*` and `detail.costs.*` strings, vi + en.

## Scope notes

- No payment processing, no deposit escrow — this is information display.
- Don't fold these into the amenities system; they're structured facts with
  values, not boolean tags.
- Filters ("no deposit", "utilities included") are a natural v2 once the
  data exists — note it, don't build it with v1.
