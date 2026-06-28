import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { BackToResults } from "./components/back-to-results";
import { DetailContent } from "./components/detail-content";
import { DetailSkeleton } from "./components/detail-skeleton";
import { SEED_LISTINGS } from "@/lib/data/listings";

// Enumerate the known (seed) listing ids so the route's params are statically
// resolvable under cacheComponents. Live Supabase ids still render on-demand
// (dynamicParams defaults to true).
export function generateStaticParams() {
  return SEED_LISTINGS.map((l) => ({ id: l.id }));
}

export default async function ApartmentDetailPage({
  params,
}: PageProps<"/[lang]/apartments/[id]">) {
  // Resolve params here and opt into static rendering for this locale. Reading
  // params at the page level (rather than deferring the promise into Suspense)
  // keeps the root layout's <html lang> param access from blocking the route
  // under cacheComponents. The slow, listing-dependent work still streams in
  // below the Suspense boundary as a layout-shaped skeleton.
  const { lang, id } = await params;
  setRequestLocale(lang);

  return (
    <div className="container mx-auto px-5 sm:px-8 pt-6 pb-28 md:pb-6">
      <BackToResults />
      <Suspense fallback={<DetailSkeleton />}>
        <DetailContent id={id} />
      </Suspense>
    </div>
  );
}
