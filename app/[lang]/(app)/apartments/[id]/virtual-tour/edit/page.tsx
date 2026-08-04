import { setRequestLocale } from "next-intl/server";
import { TourEditor } from "./components/tour-editor";
import { shellParams } from "../../lib/shell-params";
import { privateMetadata } from "@/lib/seo";

/* The owner's tour editor. Private (auth-gated by lib/supabase/middleware,
   noindexed) and hydrated client-side from the owner's own rows under RLS, so
   the prerendered shell is identical for every id.

   generateStaticParams is not about crawlability here — nothing links to this
   page publicly. Under `cacheComponents` a route with no prerendered params
   can't render the (app) layout's <SiteHeader>, which resolves the locale
   outside any cache boundary; one shell per locale satisfies that. See
   ../../lib/shell-params.ts. Listings render on demand (dynamicParams
   defaults to true). Same reasoning as ../../edit/page.tsx. */
export const generateStaticParams = shellParams;

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
