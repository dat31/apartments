---
name: i18n-translation
description: Translate or add localized UI strings in this Next.js 16 + next-intl v4 repo (vi default + en). Use when asked to translate a page/component, extract hardcoded strings into messages, add a new language string, localize numbers/dates/currency, or wire next-intl into a server or client component. Enforces server-first translation, the messages/ file shape, namespace conventions, and the smallest client message footprint.
---

# i18n translation (next-intl)

How to translate UI in this repo. Stack: **next-intl v4**, routes under `app/[lang]`, locales `vi` (default) + `en`, `localePrefix: "as-needed"`. Messages live in [messages/vi.json](../../../messages/vi.json) and [messages/en.json](../../../messages/en.json).

Config: [i18n/routing.ts](../../../i18n/routing.ts) · [i18n/request.ts](../../../i18n/request.ts) · [i18n/navigation.ts](../../../i18n/navigation.ts) · provider + `setRequestLocale` in [app/[lang]/layout.tsx](../../../app/[lang]/layout.tsx).

Reference usages already in the repo:
- Async Server Component → `getTranslations`: [app/[lang]/page.tsx](../../../app/[lang]/page.tsx)
- Client Component → `useTranslations`: [components/site-header.tsx](../../../components/site-header.tsx), [app/[lang]/(auth)/signin/page.tsx](../../../app/[lang]/(auth)/signin/page.tsx)

## Core principles (server-first)

1. **Translate on the server by default.** Messages then never ship to the client and the i18n runtime stays off the client bundle. Don't add `"use client"` just to call a translation — keep the component a Server Component.
2. **Pick the right API by component kind:**
   - **Async** Server Component (a `page.tsx`/layout that `await`s, or any `async function`): use **`getTranslations`** from `next-intl/server` (hooks can't run in async components).
   - **Sync / shared** component (no `async`, no `"use client"`): use **`useTranslations`** from `next-intl`. These "shared" components run on the server here but also work if imported into a client tree.
   - **Client** component (already has `"use client"` for a hook/handler): prefer receiving translated strings **as props** from a server parent; call `useTranslations` directly only when that's clearly cleaner (a form with many strings, a deeply-client subtree).
3. **Smallest client footprint.** For interactive UI, translate in the server parent and pass labels down (Option A/B below) rather than sending messages to the client.
4. **Mirror both locale files.** Every key added to `messages/en.json` must exist with the same shape in `messages/vi.json`, and vice versa — a missing key is a runtime/dev error, not a silent fallback.

## The server/client decision

| Scenario | Do this |
| --- | --- |
| `page.tsx` / async server component | `const t = await getTranslations("ns")` |
| Static server component, no `async` | `const t = useTranslations("ns")` |
| Interactive component, few strings | translate in server parent, pass as `label`/`title` props |
| Interactive component wraps server UI | pass the translated server component as `children` |
| Client component with many strings | `useTranslations("ns")` (messages already provided, see below) |

### Hook → async-server equivalents

In an `async` Server Component, swap every hook for its awaitable `next-intl/server` version:
`useTranslations`→`getTranslations`, `useFormatter`→`getFormatter`, `useLocale`→`getLocale`, `useNow`→`getNow`, `useTimeZone`→`getTimeZone` (plus `getMessages`).

## Patterns

### Async Server Component (page)

```tsx
// app/[lang]/some/page.tsx
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function Page({ params }: PageProps<"/[lang]/some">) {
  const { lang } = await params;
  setRequestLocale(lang);            // keep the route statically rendered
  const t = await getTranslations("some");
  return <h1>{t("title")}</h1>;
}
```

**Always call `setRequestLocale(lang)`** in a translated page/layout before reading translations — otherwise the route opts out of static rendering (cacheComponents/PPR). See [app/[lang]/page.tsx](../../../app/[lang]/page.tsx).

### Client Component using `useTranslations`

```tsx
"use client";
import { useTranslations } from "next-intl";

export function Saved() {
  const t = useTranslations("header");
  return <span>{t("saved")}</span>;
}
```

This works because the root layout renders `<NextIntlClientProvider>` (no `messages` prop), which **inherits all messages from the server** and makes them available to every client component. Fine while the message set is small.

### Option A — translate in server, pass strings as props (preferred for interactivity)

```tsx
// FaqEntry.tsx — Server Component
import { useTranslations } from "next-intl";
import { Expandable } from "./expandable"; // client

export function FaqEntry() {
  const t = useTranslations("faq");
  return <Expandable title={t("title")}>{t("body")}</Expandable>;
}
```

The client `Expandable` owns the `useState`; the strings are already translated on the server, so no messages cross the boundary.

### Option B — pass a server component as `children`

When an interactive shell needs translated content inside it, render the translated server UI as `children` of the client component (e.g. a `<Form>` client wrapper around server-translated `<Field label={t(...)}/>`).

### Trimming the client message bundle (only if it gets large)

The current root provider sends **all** messages to the client. If that bundle grows enough to matter (measure first — total blocking time / INP), stop sending everything: set `messages={null}` (or omit) at the root and add a targeted provider around the specific client subtree:

```tsx
// Counter.tsx — Server Component wrapper
import pick from "lodash/pick";
import { NextIntlClientProvider, useMessages } from "next-intl";

export function Counter() {
  const messages = useMessages();
  return (
    <NextIntlClientProvider messages={pick(messages, "counter")}>
      <ClientCounter />
    </NextIntlClientProvider>
  );
}
```

Don't do this preemptively. Default (all messages) is fine until proven otherwise.

## Message files

- One JSON object per locale; **top-level (or dotted) keys are namespaces**. `useTranslations("header")` → `t("tours")`; `useTranslations("auth.signin")` → `t("title")`.
- Group by feature/section. Keep keys stable and descriptive (`auth.signin.submit`, not `btn1`).
- Add to **both** `messages/vi.json` and `messages/en.json` with identical structure. vi is the source of truth for meaning (primary audience); write natural Vietnamese, not literal translations of the English.

### ICU: plurals & interpolation

next-intl supports full ICU — use it instead of string concatenation:

```jsonc
// messages/en.json
{ "search": { "results": "{count, plural, =0 {No homes} one {# home} other {# homes}}" } }
```
```tsx
t("results", { count }); // -> "9 homes"
```

For embedded markup use `t.rich("key", { b: (chunks) => <b>{chunks}</b> })`.

### Numbers, dates, currency

Use the formatter, not manual string-building. Server: `getFormatter()`; client/shared: `useFormatter()`.

```tsx
const format = await getFormatter();
format.number(price, { style: "currency", currency: lang === "vi" ? "VND" : "USD" });
format.dateTime(date, { dateStyle: "medium" });
```

Planned currency rule for this app: **VND for `vi`, USD for `en`** — replace `money()` in [lib/data/listings.ts](../../../lib/data/listings.ts). Note this is a *display* concern; the underlying amount (single USD `z.number()` today) still needs a per-currency value or a conversion rate — decide that separately.

## Workflow to translate a page/component

1. **Scan** the file for every hardcoded user-facing string (text, `aria-label`, `placeholder`, `title`, toast messages).
2. **Choose a namespace** (the feature/section) and add the keys to **both** `messages/{vi,en}.json`.
3. **Pick the API** by component kind (table above). Add `setRequestLocale(lang)` if it's a translated page/layout.
4. **Replace literals** with `t("key")` calls. For interactive client leaves, prefer translating in the server parent and passing props.
5. **Keep navigation locale-aware** — use `Link`/`useRouter`/`usePathname`/`redirect` from [i18n/navigation.ts](../../../i18n/navigation.ts), never `next/link` or `next/navigation` directly, so paths respect the as-needed prefix.
6. **Verify**: `pnpm build` (route should still prerender; missing-key errors surface here), and switch languages in the app to eyeball both locales.

## Anti-patterns

- ❌ Adding `"use client"` to a component just to call `useTranslations`. Keep it server; or translate in the parent and pass props.
- ❌ `useTranslations` inside an `async` Server Component. Use `getTranslations`.
- ❌ Forgetting `setRequestLocale(lang)` in a translated page → silently drops static rendering.
- ❌ Adding a key to one locale file only. Both must match.
- ❌ Building plurals/sentences by string concatenation. Use ICU `{count, plural, ...}` / `t.rich`.
- ❌ Formatting money/dates with `toLocaleString()` ad hoc. Use `useFormatter`/`getFormatter`.
- ❌ `import Link from "next/link"` in localized UI. Use the `Link` from `@/i18n/navigation`.

## Architecture note (don't relitigate)

`<html lang>` is set in [app/[lang]/layout.tsx](../../../app/[lang]/layout.tsx) (correct per-locale SSR), and the `LanguageSwitcher` uses **full-page navigation** on purpose — `next-themes` injects a `<script>` in that layout, so a soft locale switch throws "Encountered a script tag…". Don't convert the switcher to a soft `<Link locale>` without removing that constraint.

## Definition of done

- No hardcoded user-facing strings remain in the translated file (incl. `aria-label`/`placeholder`/toasts).
- Keys exist in **both** `messages/vi.json` and `messages/en.json` with matching shape; Vietnamese reads naturally.
- Server components use `getTranslations`/`useTranslations` correctly; client leaves receive props where practical.
- `setRequestLocale(lang)` present in translated pages/layouts.
- `pnpm build` passes; both locales render correctly in the app.
