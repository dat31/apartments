# 10. Compare saved homes side by side

**Impact: high for serious renters, effort: medium.** The Saved page answers
"what did I like?" but not the question that actually follows: "which one?".
Renters end up rebuilding this comparison in a notes app or spreadsheet.

## The flow

1. Renter opens `/apartments/saved` with a shortlist of, say, 6 homes.
2. A **"Compare"** button enters selection mode: cards get checkboxes, a
   sticky bottom bar counts selections ("2/4 selected · Compare"). Cap at 4 —
   beyond that a table stops being readable, especially on mobile.
3. Tapping Compare navigates to `/apartments/saved/compare?ids=a,b,c` —
   ids in the URL so the comparison is shareable/bookmarkable (pairs
   naturally with #9: send the comparison to a partner).
4. The compare view is a **column-per-home table**, sticky first column of
   row labels, horizontal scroll on mobile:
   - photo + title (links to detail) + save/remove
   - price (highlight the cheapest), price per m²
   - area, beds, baths, type, district
   - available date
   - amenity matrix — one row per amenity with ✓/— per column; this is where
     side-by-side genuinely beats flipping between tabs
   - if #11 (commute anchor) exists: distance to the renter's pin
5. Removing a column updates the URL param in place. From the compare view,
   the natural exits are a detail page or straight into **book tour**.

## Why it fits this app

The shortlist, the structured listing schema, and consistent amenity ids
already exist — comparison is almost pure presentation. Few rental apps do
this well, and it directly serves the decision moment before booking tours
(often renters tour exactly their compare-set — which then feeds the
existing tour-day route planner).

## Integration points

- **Route:** new page under `app/[lang]/(app)/apartments/saved/compare/`.
  Guests work too: ids come from the URL, and guest shortlist membership
  isn't even required to render the table.
- **Data:** fetch by ids the same way the Saved page does
  (`hooks/use-saved-listings.ts` pattern → `.in("id", ids)` + `toListing`),
  seed-id fallback included.
- **Fields:** everything above is already on the domain `Listing`
  (`schemas/listing`); amenity labels/icons from `lib/data/listings.ts`
  `AMENITIES` + `AMENITY_ICONS`.
- **Money/i18n:** `use-money.ts` for prices; strings under a new `compare`
  (or `saved.compare`) namespace.

## Scope notes

- No user-added custom rows/notes in v1 (tempting, but it's a different
  feature — per-listing private notes could be its own later item).
- Selection mode state is page-local; only the compare URL persists.
