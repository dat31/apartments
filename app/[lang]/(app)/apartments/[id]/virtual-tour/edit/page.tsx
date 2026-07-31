import { setRequestLocale } from "next-intl/server";
import { TourEditor } from "./components/tour-editor";
import { getActiveListings } from "@/lib/services/listings";
import { privateMetadata } from "@/lib/seo";

/* The owner's tour editor. Private (auth-gated by lib/supabase/middleware,
   noindexed) and hydrated client-side from the owner's own rows under RLS, so
   the prerendered shell is identical for every id.

   generateStaticParams is not about crawlability here — nothing links to this
   page publicly. Under `cacheComponents` a route with unknown params is fully
   dynamic, and that makes the (app) layout's <SiteHeader> read the locale
   outside any cache boundary or <Suspense>, which Next rejects as a blocking
   route. Generating the shell for the same listings the detail route
   prerenders resolves the layout at build time instead. Listings created
   after the build render on demand (dynamicParams defaults to true); if
   Supabase is unreachable at build time, prerender nothing rather than
   failing the build. Same reasoning as ../../edit/page.tsx. */
export async function generateStaticParams() {
  try {
    return (await getActiveListings()).map((l) => ({ id: l.id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/apartments/[id]/virtual-tour/edit">) {
  const { lang } = await params;
  return privateMetadata(lang, "tourEditor");
}

export default async function VirtualTourEditPage({
  params,
}: PageProps<"/[lang]/apartments/[id]/virtual-tour/edit">) {
  const { lang, id } = await params;
  setRequestLocale(lang);
  return <TourEditor listingId={id} />;
}
