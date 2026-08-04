/* Static params for the private routes under /apartments/[id] whose
   prerendered output does not depend on the id at all — the edit form, the
   tour editor, and any other shell that hydrates its listing client-side (or
   below a Suspense boundary). Every shell they prerender is byte-for-byte the
   same page.

   They still need *a* prerendered param, and can't opt out:

   - Dropping generateStaticParams leaves the route with only a fallback shell,
     where `id` is unknown. Awaiting `params` then hangs, and the (app)
     layout's <SiteHeader> resolves its locale outside any cache boundary —
     which Next rejects under `cacheComponents` as a blocking route.
   - Returning [] is a hard build error (EmptyGenerateStaticParamsError):
     Cache Components requires at least one result so it can validate the
     route at build time.

   So they prerender exactly one shell per locale, under an id no listing can
   have (ids are uuids). Real listings render on demand and are indistinguish-
   able from the shell — which is the point. This replaces enumerating every
   active listing, which built ~45 identical copies of each shell. */
export const SHELL_ID = "shell";

export function shellParams() {
  return [{ id: SHELL_ID }];
}
