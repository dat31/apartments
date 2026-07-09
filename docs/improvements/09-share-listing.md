# 9. Share listing

**Impact: medium, effort: tiny.** Renting is almost always a two-person
decision — partner, roommate, parent. Today sharing means copying the URL
from the address bar; on mobile (where most browsing happens) that's several
taps and easy to fumble.

## The flow

1. Detail page header area (next to the existing save button) gains a
   **Share** icon button.
2. Tap behavior:
   - **Mobile / supporting browsers:** `navigator.share({ title, text, url })`
     → the native share sheet (Zalo, Messenger, WhatsApp, SMS…). In Vietnam,
     Zalo being in the native sheet is exactly why the native path matters.
   - **Desktop / no Web Share API:** copy the URL to the clipboard and show
     the existing toast style ("Link copied") via `sonner`, which is already
     wired app-wide.
3. The shared link is the plain listing URL — already localized, already
   canonical (`pageAlternates` in `lib/seo.ts`), and already renders rich
   previews: the detail page has JSON-LD and the repo has an OG image
   pipeline (`lib/og.tsx`), so pasted links unfurl with the listing photo
   and title in chat apps.

## Integration points

- **Placement:** `apartments/[id]/components/detail-view.tsx`, alongside
  `SaveHomeButton` — same visual grammar (icon button). Tour cards on
  `/tour` could reuse the same component later ("send the plan to my
  partner"), but detail-page-first.
- **Component:** one small client component (`share-button.tsx` in
  `components/` since it's generic) taking `{ title, url }`. Feature-detect
  `navigator.share`; treat share-sheet dismissal (AbortError) as a no-op,
  not an error toast.
- **Strings:** `detail.share` + toast message in both `messages/vi.json`
  and `messages/en.json`.

## Scope notes

- No share-tracking params, no shortlinks, no per-network buttons — the
  native sheet and clipboard cover everything.
- Verify the OG image actually renders for listing pages while touching
  this; if it doesn't, that fix is part of this feature's value.
