import { getTranslations } from "next-intl/server";
import { ListingCard } from "@/components/listing-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonListingCard } from "@/components/skeleton-listing-card";
import { districtLabel, type Listing } from "@/schemas/listing";
import { getSimilarListings } from "@/lib/services/listings";

/* "Similar homes" row, shown full-width below the detail two-column layout.

   Async server component that owns its data: it runs its own district/city-
   scoped Supabase query (getSimilarListings) and renders the ranked picks as
   the exact browse ListingCard — so save buttons, price formatting, and
   availability labels all come along for free. Each card opens its own detail
   page (which shows its own row), letting renters hop laterally through
   comparable inventory instead of returning to browse.

   Lives behind its own <Suspense> in DetailView (SimilarHomesSkeleton
   fallback), so the main listing content paints as soon as the listing + owner
   resolve and this heavier below-the-fold query streams in underneath rather
   than blocking the whole page. */
export async function SimilarHomes({ listing }: { listing: Listing }) {
  const [t, { picks, districtScoped }] = await Promise.all([
    getTranslations("detail.similar"),
    getSimilarListings(listing),
  ]);
  if (!picks.length) return null;

  const district = districtLabel(listing.district);
  const city = listing.city.split(",")[0].trim() || listing.city;
  const heading = districtScoped
    ? t("headingDistrict", { district })
    : t("headingCity", { city });
  const sub = districtScoped ? t("subDistrict") : t("subCity", { city });

  return (
    <section className="mt-14" aria-label={t("aria")}>
      <div className="mb-5">
        <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{sub}</p>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
        {picks.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </section>
  );
}

/* Fallback while the similar query streams — mirrors the heading + 3-card grid
   so the page doesn't shift when the row lands. */
export function SimilarHomesSkeleton() {
  return (
    <section className="mt-14" aria-busy="true" aria-label="Loading similar homes">
      <div className="mb-5">
        <Skeleton className="skeleton h-8 w-64 max-w-full" />
        <Skeleton className="skeleton mt-2 h-4 w-80 max-w-full" />
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonListingCard key={i} />
        ))}
      </div>
    </section>
  );
}
