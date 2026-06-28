# i18n translation — handoff

Status of the "translate the remaining UI" effort. Resume from **Phase 5**.

- **Branch:** `feat/i18n-routing` (PR #19); Phase 4 on `feat/i18n-translate-detail-tour`
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
| 4 | Apartment detail (detail-view, gallery, reviews, review-pager, availability-label, save-home, back-to-results, detail-skeleton) + tour booking (book-tour button/dialog, time-slots, month-calendar, recaptcha) | _this branch_ | `detail.*`, `tours.*` |

Existing namespaces: `common`, `header`, `landing`, `auth`, `errors`, `account`, `profile`, `apartments`, `detail`, `tours`.

**Phase 4 notes:**
- `detail-view` now pulls type/amenity/beds labels from the existing `apartments.*` keys (no new keys for those); reused `apartments.card.availableNow/availableOn` in `availability-label.tsx` (migrated it off the deprecated `availLabel`).
- Tour dates/times are formatted with `useFormatter` (`book-tour-dialog`, `time-slots`, `month-calendar` month header + locale weekday initials) instead of the English helpers in `constants/tours.ts` — those helpers (`tourDateLong/Med`, `tourTimeLabel`, `MONTHS`, `WD_SHORT`) are **still used by Phase 6 files** (owner/renter tour cards, propose-time-modal, availability-editor), so they were left in place.
- `specStr` (lib/data/listings.ts) is now unused by detail-view but **still used by `owner/dashboard/components/listing-row.tsx`** → delete in Phase 6/7.
- `money()` left as-is (USD) — currency is Phase 7.

## Remaining ⬜

### Phase 5 — Listing form (create/edit)
`app/[lang]/(app)/apartments/components/listing-form.tsx`, `photo-uploader.tsx`, `photo-card.tsx`, `amenity-picker.tsx`, `create/page.tsx`, `[id]/edit/page.tsx`, and `constants/listing-form.ts` (field labels, `DISTRICT_LABELS`, bed/bath options).
Suggested namespace: `listingForm.*`.

### Phase 6 — Owner dashboard + profile + saved + tour pages
- Dashboard: `owner/dashboard/components/*` (header, nav, dashboard-stats, stat-card, listing-row, listings-tab, owner-tours, owner-tour-card, propose-time-modal, availability-editor) + dashboard pages (overview/active/drafts/tours/availability/layout).
- Owner profile: `owner/[id]/page.tsx`, `components/owner-profile.tsx`, `review-modal.tsx`, `star-picker.tsx`.
- Saved: `apartments/saved/components/saved-list.tsx`, `saved/page.tsx`.
- Tour (renter): `tour/page.tsx`, `components/renter-tours.tsx`, `renter-tour-card.tsx`.
- Shared: `components/status-tag.tsx` (tour statuses Pending/Confirmed/Declined/New time proposed), `review-card.tsx`, `save-button.tsx`.
Suggested namespaces: `dashboard.*`, `owner.*`, `saved.*`, `tour.*`.

### Phase 7 — Currency + cleanup + final pass
- **Currency:** make `money()` in `lib/data/listings.ts` locale-aware — VND for `vi`, USD for `en` via `Intl.NumberFormat` (or `useFormatter().number(v, {style:"currency", currency})`). Open question still: the underlying amount is a single USD `z.number()`; decide store-per-currency vs. base+rate.
- Final `pnpm build:local` + browser eyeball both locales end-to-end.

## Data-layer debts to clean up (carried from Phase 3)

- `lib/data/listings.ts`:
  - `specStr()` still returns English ("Studio" / "{n} bed"). Used by `detail-view.tsx` and `owner/dashboard/components/listing-row.tsx` — migrate those to `t("apartments.card.studio"/"apartments.card.beds")` and delete `specStr` (or keep only for non-UI use).
  - `availLabel()` is **deprecated** — kept only because `availability-label.tsx` still uses it. Migrate that file to `availInfo()` + `t("apartments.card.availableNow"/"availableOn")` (see `components/listing-card.tsx` for the pattern), then delete `availLabel`.
  - `money()` → currency phase (above).
- Listing `status` ("active" / "draft") shown in `listing-row.tsx` — add labels (e.g. `dashboard.status.*`).
- Owner data shown on the profile (`OWNERS[*].responseTime` like "within an hour", `languages: ["English","Vietnamese"]`) — these are seed strings in `lib/data/listings.ts`; decide whether to localize at render (map to message keys) or leave as seed data.
- Month names: `monthLabel()` / `MONTHS` in `lib/data/listings.ts` are English — prefer `useFormatter().dateTime` at call sites for any visible month/date.

## Notes / decisions already made

- All visible labels get translated, including enum-like data (types/amenities/statuses) — **except district names** (Vietnamese proper nouns, unchanged).
- Architecture is locked: `<html lang>` in the localized layout, full-page-nav language switcher (next-themes constraint). Don't change these. See memory `i18n-root-layout-split`.
- Client message footprint: root provider currently sends **all** messages (fine for now). Only switch to `pick()` per-subtree if the bundle becomes a measured problem.
