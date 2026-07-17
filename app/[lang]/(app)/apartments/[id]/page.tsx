import { Suspense } from "react";
import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { BackToResults } from "./components/back-to-results";
import { DetailContent } from "./components/detail-content";
import { DetailSkeleton } from "./components/detail-skeleton";
import { ShareHeaderSlot } from "./components/share-header-slot";
import { getListing, SEED_LISTINGS } from "@/lib/data/listings";
import { getListingById } from "@/lib/services/listings";
import { districtLabel } from "@/schemas/listing";
import { formatMoney } from "@/lib/money";
import { ogDefaults, pageAlternates } from "@/lib/seo";

// Enumerate the known (seed) listing ids so the route's params are statically
// resolvable under cacheComponents. Live Supabase ids still render on-demand
// (dynamicParams defaults to true).
export function generateStaticParams() {
  return SEED_LISTINGS.map((l) => ({ id: l.id }));
}

/* Listing-derived metadata: unique title/description per home, the cover
   photo as the social-share image, and per-locale canonicals. getListingById
   is "use cache"d, so this shares the page's own read. A missing listing
   returns the layout defaults; the page itself 404s via notFound(). */
export async function generateMetadata({
  params,
}: PageProps<"/[lang]/apartments/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  const listing = (await getListingById(id)) ?? getListing(id);
  if (!listing) return {};

  const [t, ta, format] = await Promise.all([
    getTranslations({ locale: lang, namespace: "meta.detail" }),
    getTranslations({ locale: lang, namespace: "apartments" }),
    getFormatter({ locale: lang }),
  ]);

  const district = districtLabel(listing.district);
  const title = t("title", { title: listing.title, district });
  const description = t("description", {
    beds: listing.beds,
    baths: listing.baths,
    area: listing.area,
    type: ta(`types.${listing.type}`),
    district,
    city: listing.city,
    price: formatMoney(format, lang, listing.price),
  });

  return {
    title,
    description,
    alternates: pageAlternates(lang, `/apartments/${id}`),
    openGraph: {
      ...ogDefaults(lang),
      title,
      description,
      // No photos → omit images so the site-wide opengraph-image applies.
      ...(listing.images?.length ? { images: [listing.images[0]] } : {}),
    },
  };
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
  const t = await getTranslations("detail");

  return (
    <div className="container mx-auto px-5 sm:px-8 pt-6 pb-28 md:pb-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <BackToResults />
        {/* Mobile share lives here in the header row; on tablet/desktop it
            renders nothing (the share button sits beside the title instead). */}
        <Suspense fallback={null}>
          <ShareHeaderSlot id={id} />
        </Suspense>
      </div>
      <Suspense fallback={<DetailSkeleton label={t("loadingHome")} />}>
        <DetailContent id={id} />
      </Suspense>
    </div>
  );
}
