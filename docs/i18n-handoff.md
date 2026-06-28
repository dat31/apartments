# i18n translation — handoff

Status of the "translate the remaining UI" effort. Resume from **Phase 6c** (saved + renter tours).

- **Branches:** Phase 4 → #22; Phase 5 → #23; **Phase 6 in 3 PRs** — 6a owner dashboard → #24; 6b owner profile + reviews → `feat/i18n-translate-owner-profile` (this branch); 6c saved + renter tours.
- **Stack:** next-intl v4 · routes under `app/[lang]` · locales `vi` (default) + `en` · `localePrefix: "as-needed"`
- **Messages:** `messages/vi.json`, `messages/en.json` (keep both in sync, same shape)
- **Skill:** invoke `i18n-translation` before continuing — it has the full conventions, server/client API rules, and non-component (metadata/actions/route-handler) guidance.
- **Config:** `i18n/routing.ts`, `i18n/request.ts`, `i18n/navigation.ts`; provider + `setRequestLocale` in `app/[lang]/layout.tsx`.

## How to work each file (quick recap)

1. Async Server Component / `page.tsx` → `const t = await getTranslations("ns")` (+ `setRequestLocale(lang)` if it's a page/layout).
2. Sync server / shared component → `const t = useTranslations("ns")`.
3. Client component → `useTranslations("ns")` (messages already provided by the root provider); for interactive leaves prefer passing translated strings as props.
4. Both `messages/*.json` must get the key. Vietnamese is the source of truth for meaning — write natural Vietnamese, not literal translations.
5. Use ICU plurals (`{count, plural, …}`) and `t.rich(...)` for embedded markup; `useFormatter`/`getFormatter` for numbers/dates.
6. Navigation only via `@/i18n/navigation` (`Link`, `useRouter`, `usePathname`, `redirect`).
7. Verify: `pnpm build:local` (build is the gate; client missing-keys only error at runtime, so also switch languages in the app).
8. District names stay as-is (Vietnamese proper nouns) — do **not** translate them.

## Done ✅ (committed + built green)

| Phase | Area | Commit | Namespaces added |
|------|------|--------|------------------|
| 1 | Auth (signin/signup/forgot/reset, brand panel, password field, auth shell) | `a7106ad` | `auth.*`, `common.toggleTheme` |
| 2 | Landing + global chrome (role chooser/cards, hero, district tiles, showcase, error/404, error shell, account menu, manage-profile dialog, theme toggle) | `e9e53e7` | `landing.*`, `errors.*`, `account.*`, `profile.*` |
| 3 | Apartments browse (filters, sort, empty, pagination, summary) + listing card + data labels (home types, amenities, sort, availability, beds) | `6bea53c` | `apartments.*` |
| 4 | Apartment detail (detail-view, gallery, reviews, review-pager, availability-label, save-home, back-to-results, detail-skeleton) + tour booking (book-tour button/dialog, time-slots, month-calendar, recaptcha) | #22 | `detail.*`, `tours.*` |
| 5 | Listing form create/edit (listing-form, photo-uploader, photo-card, amenity-picker) | #23 | `listingForm.*` |
| 6a | Owner dashboard (header, nav, stats, stat-card, listings-tab, listing-row, owner-tours, owner-tour-card, propose-time-modal, availability-editor) + shared `status-tag` | #24 | `dashboard.*`, `tours.status.*` |
| 6b | Owner profile (owner-profile, review-modal, star-picker) + shared `review-card`, `star-row` | _this branch_ | `owner.*` (+ `detail.reviews.stayedAt/outOf`) |

Existing namespaces: `common`, `header`, `landing`, `auth`, `errors`, `account`, `profile`, `apartments`, `detail`, `tours`, `listingForm`, `dashboard`, `owner`.

**Phase 4 notes:**
- `detail-view` now pulls type/amenity/beds labels from the existing `apartments.*` keys (no new keys for those); reused `apartments.card.availableNow/availableOn` in `availability-label.tsx` (migrated it off the deprecated `availLabel`).
- Tour dates/times are formatted with `useFormatter` instead of the English helpers in `constants/tours.ts`. After 6a, `tourDateMed`/`tourTimeLabel`/`WD_SHORT` are **still used only by the renter tour card** (`tour/components/renter-tour-card.tsx`, Phase 6c) — migrate + delete there. `tourDateLong`/`MONTHS` may already be unused; re-check in 6c/7.
- `money()` left as-is (USD) — currency is Phase 7.

**Phase 6a notes:**
- New `dashboard.*` namespace; `tours.status.*` (Pending/Confirmed/Declined/New time proposed) added under the existing `tours` namespace and consumed by shared `components/status-tag.tsx` (reused by the renter tour pages in 6c).
- `listing-row` migrated off `specStr` (reuses `apartments.card.studio/beds/perMonth` + `apartments.types.*`); **`specStr` deleted** from `lib/data/listings.ts`.
- `owner-tour-card`, `propose-time-modal`, `availability-editor` migrated to `useFormatter` for dates/times (incl. locale weekday labels + compact hour chips); people counts reuse `tours.people`/`tours.peopleMax`.
- Dashboard pages (`overview/active/drafts/tours/availability/layout`) and `stat-card` have no strings of their own — left untouched.

**Phase 5 notes:**
- `amenity-picker` reuses `apartments.amenities.*`; the home-type select reuses `apartments.types.*`. District options keep `DISTRICT_LABELS` (proper nouns, untranslated).
- `create/page.tsx` and `[id]/edit/page.tsx` have no strings of their own (they just render `ListingForm`) — left untouched.
- Numeric example placeholders (`1800`, `58`) left literal (language-neutral).
- **Known debt (cross-cutting): client zod validation messages are still English.** `schemas/listing/index.ts` (`"Give your listing a title."`, `"Enter a price above 0."`, `"Choose a district."`) and `schemas/auth/index.ts` (Phase 1 left these too). These render via `<FieldError>`. Fixing properly = a schema-factory that takes a translator (or render-time mapping by `issue.path`) applied consistently across all `schemas/*`. Worth its own pass — see Phase 7 cleanup.

## Remaining ⬜

**Phase 6b notes:**
- `owner.*` namespace; reuses `detail.reviews.*` for generic review words (title/count/emptyTitle/pagination/prev/next) and extends it with `stayedAt` + `outOf` (consumed by shared `review-card` / `star-row`, which render on the detail page too).
- **Owner seed values localized** (per decision): `responseTime` → `owner.responseTime.{hour,fewHours,day}` via an exact-string map; `languages` → `owner.language.*` (lowercased name → key). Owner `bio`, `name`, `location` stay as seed prose.
- `monthLabel()` + the English `MONTHS` array **deleted** from `lib/data/listings.ts` — `owner-profile` (`joined`) and `review-card` (`date`) now use `useFormatter().dateTime` on the `"YYYY-MM"` keys.
- `owner-profile.tsx`: the i18n refactor made the component React-Compiler-compilable, surfacing a pre-existing impurity (`Date.now()`/`new Date()` for a new review's id/timestamp). Scoped `eslint-disable react-hooks/purity` around those two event-time lines (they run on submit, not render).
- Review form zod messages (`schemas/review/index.ts`) left English — same cross-cutting debt as auth/listing (Phase 7).

### Phase 6c — Saved + renter tours (next)
- Saved: `apartments/saved/components/saved-list.tsx`, `saved/page.tsx`.
- Tour (renter): `tour/page.tsx`, `components/renter-tours.tsx`, `renter-tour-card.tsx`.
- Shared: `components/save-button.tsx`. Reuses `tours.status.*` (StatusTag, done in 6a).
- Migrate `renter-tour-card.tsx` off `tourDateMed`/`tourTimeLabel` to `useFormatter`, then delete those (+`WD_SHORT`, and re-check `tourDateLong`/`MONTHS`) from `constants/tours.ts` if fully unused.
Suggested namespaces: `saved.*`, `tour.*`.

### Phase 7 — Currency + cleanup + final pass
- **Currency:** make `money()` in `lib/data/listings.ts` locale-aware — VND for `vi`, USD for `en` via `Intl.NumberFormat` (or `useFormatter().number(v, {style:"currency", currency})`). Open question still: the underlying amount is a single USD `z.number()`; decide store-per-currency vs. base+rate.
- **Zod validation messages:** still English across `schemas/auth/index.ts` and `schemas/listing/index.ts` (rendered client-side via `<FieldError>`). Introduce a schema-factory that takes a translator (or map errors by `issue.path` at render) and apply it consistently to all `schemas/*`.
- Delete now-unused helpers from `constants/tours.ts` once 6c migrates the renter card (`WD_SHORT`, possibly `tourDateLong/Med`, `tourTimeLabel`, `MONTHS`).
- Final `pnpm build:local` + browser eyeball both locales end-to-end.

## Data-layer debts to clean up (carried from Phase 3)

- `lib/data/listings.ts`:
  - `specStr()` — **deleted** (Phase 6a; all call sites migrated to `apartments.card.studio/beds`).
  - `availLabel()` is **deprecated** and now **unused** (Phase 4 migrated `availability-label.tsx` to `availInfo()` + `t("apartments.card.availableNow"/"availableOn")`) — safe to delete in Phase 7.
  - `money()` → currency phase (above).
- Listing `status` ("active" / "draft") — **done** in 6a (`dashboard.status.*`, used by `listing-row.tsx`).
- Owner profile seed values (`responseTime`, `languages`) — **done** in 6b (localized via `owner.responseTime.*` / `owner.language.*`).
- Month names: `monthLabel()` / `MONTHS` — **deleted** in 6b; call sites use `useFormatter().dateTime`.

## Notes / decisions already made

- All visible labels get translated, including enum-like data (types/amenities/statuses) — **except district names** (Vietnamese proper nouns, unchanged).
- Architecture is locked: `<html lang>` in the localized layout, full-page-nav language switcher (next-themes constraint). Don't change these. See memory `i18n-root-layout-split`.
- Client message footprint: root provider currently sends **all** messages (fine for now). Only switch to `pick()` per-subtree if the bundle becomes a measured problem.
