---
name: design-handoff
description: Implement a design (Claude Design output, Figma, or mockup) into pages in this Next.js + Tailwind v4 + shadcn/ui repo. Use when the user asks to build/implement a screen, page, or UI from a design, or to translate a mockup into code. Enforces font/Tailwind/component-reuse constraints, zod+react-hook-form conventions, theme tokens, and the ordered scan→tokens→components→pages workflow.
---

# Design → Code Handoff

Rules for turning a design into implemented pages in this repo. Follow fully before writing UI code.

## Stack (do not change)

- **Next.js 16** App Router (`/app`), React 19, TypeScript.
- **Tailwind CSS v4** — theme is CSS-first in [app/globals.css](../../../app/globals.css) via `@theme inline`. No `tailwind.config.js`.
- **shadcn/ui** components in [components/ui/](../../../components/ui/) — built with `class-variance-authority` (CVA) + `radix-ui` + `cn()` from [lib/utils.ts](../../../lib/utils.ts).
- **Fonts via `next/font/google`** only, wired in [app/layout.tsx](../../../app/layout.tsx) as CSS variables. Geist is the current default but is **not** required — choose whatever Google font(s) best match the design.
- Forms: `react-hook-form` + `@hookform/resolvers` + `zod`. Validation lives in zod schemas.

## Strict constraints

1. **Fonts** — only `next/font/google`; pick the font(s) that match the design (Geist is just the current default, swap it freely). Register each in `app/layout.tsx` as a `--font-*` variable and map it to a token in `@theme inline` (e.g. `--font-sans`, `--font-heading`). Never hardcode font-family strings or `<link>` tags.
2. **Tailwind first** — style with Tailwind utility classes driven by theme tokens, and avoid inline `style={}` for anything a token can express. Tailwind is not required to be 100%: for CSS it can't express cleanly (e.g. complex `@keyframes`/animations), add the rule to a `.css` file (`globals.css` or a co-located module) and reference it by class. Reach for CSS only when Tailwind genuinely can't do it.
3. **Reuse existing components** — every UI element MUST map to an existing component in `components/ui/`. To match the design:
   - ✅ Update `className` on an instance.
   - ✅ Add/adjust a CVA **variant** or **size** inside the component file.
   - ✅ Update token values in `globals.css`.
   - ❌ Do NOT delete, rename, or invent sub-components.
   - ❌ Do NOT change the component's sub-component hierarchy or `data-slot` structure (e.g. `Card` → `CardHeader`/`CardContent`/`CardFooter` stays intact).
   - If the design needs an element with no matching primitive, compose it from existing primitives — do not fork shadcn structure.

Available primitives: accordion, alert, avatar, badge, button, card, carousel, checkbox, collapsible, dialog, drawer, dropdown-menu, field, label, navigation-menu, pagination, popover, select, separator, sheet, sidebar, skeleton, tabs, tooltip, calendar, input, textarea.

## Coding conventions

- **One component per file.** No co-locating multiple components in a single file.
- **Reusable types via zod** — define a `z.object(...)` schema and derive the type with `z.infer<typeof Schema>`. Don't write standalone `interface`/`type` for data that has a schema.
- **Forms** — `useForm({ resolver: zodResolver(schema) })`; render with the `field` primitives from `components/ui/field.tsx`.
- **`cn()`** for all conditional/merged classNames. Keep CVA pattern (`data-slot`, `data-variant`, `data-size`) when extending components.
- **Imports** use the `@/` alias.

## Route / file structure

Co-locate everything a route owns under its folder:

```
app/
  <route>/
    page.tsx                      # page composition only
    components/<feature>.tsx      # one component per file
    constants/<feature>.ts        # static data, options, copy
    schemas/<feature>.ts          # zod schemas + inferred types
    hooks/use-<feature>.ts        # route-local hooks (optional)
```

Shared, cross-route primitives stay in `components/ui/`. Shared helpers in `lib/`.

## Theme tokens

Tokens are defined as CSS variables in `:root` / `.dark` and exposed through `@theme inline` in `app/globals.css`. All in **OKLCH**. Token groups: color (`--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--card`, `--popover`, `--border`, `--input`, `--ring`, `--chart-*`, `--sidebar-*`), radius (`--radius` + derived `--radius-sm…4xl`), fonts (`--font-sans`, `--font-mono`, `--font-heading`).

When the design introduces new colors/spacing/radii: **add or update a token**, then reference it — never hardcode a raw hex/oklch value in a className. Keep `:root` and `.dark` in sync.

## Implementation steps (follow in order)

1. **Scan the design** — inventory screens, sections, repeated patterns, states (hover/focus/disabled/loading/empty/error), assets (images/icons/SVGs), and which existing primitive each element maps to.
2. **Update theme tokens** — colors, radius, spacing, typography in `globals.css` (both light + dark). Wire any new font in `layout.tsx`. Place static assets in `public/` (or inline SVGs); use `next/image` for raster images.
3. **Update component styles** — adjust `className`s and add/extend CVA variants in `components/ui/` so primitives match the design. Preserve sub-component hierarchy.
4. **Define schemas + reusable components** — define zod schemas under `schemas/` first (derive types with `z.infer`), then build feature components from primitives under the route's `components/` (one per file).
5. **Implement pages** — compose feature components in `page.tsx`. Keep page files thin. Cover responsive breakpoints and all interaction states inventoried in step 1.
6. **Verify** — run `npm run build` and `npm run lint`; fix until both pass.

## Definition of done

- `npm run build` and `npm run lint` pass.
- No new fonts/colors/radii outside the token system.
- No new or removed sub-components in `components/ui/`; hierarchy and `data-slot`s intact.
- All forms validate through zod schemas; all reusable data types derive from zod.
- One component per file; route-local files follow the structure above.
