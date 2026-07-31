import { setRequestLocale } from "next-intl/server";
import { TourEditor } from "./components/tour-editor";
import { privateMetadata } from "@/lib/seo";

/* The owner's tour editor. Private (auth-gated by lib/supabase/middleware,
   noindexed) and hydrated client-side from the owner's own rows under RLS, so
   the prerendered shell is identical for every id — same shape as the listing
   edit route next door. Deliberately no generateStaticParams: unlike /edit,
   this page is reached from a listing the owner already has open, so there is
   no crawl path worth prerendering. */

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
