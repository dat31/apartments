import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Building2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard } from "@/components/listing-card";
import { SkeletonListingCard } from "@/components/skeleton-listing-card";
import { getListingsByOwner } from "@/lib/services/listings";
import { getOwnerProfile } from "@/lib/services/owners";

/* Homes shown before the "See all" affordance takes over. */
const HOMES_PREVIEW = 3;

/* The owner's listings. Async server component owning its own query, so the
   listings read streams below its own <Suspense> instead of holding up the
   hero and the reviews above it. */
export async function OwnerHomes({ id }: { id: string }) {
  const [t, owner, homes] = await Promise.all([
    getTranslations("owner"),
    getOwnerProfile(id),
    getListingsByOwner(id),
  ]);
  if (!owner) return null;

  const firstName = owner.name.split(" ")[0];
  // "See all" carries the owner over to the browse page as a filter.
  const homesHref = `/apartments?owner=${encodeURIComponent(owner.key)}`;

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("homesBy", { count: homes.length, name: firstName })}
        </h2>
        {homes.length > HOMES_PREVIEW && (
          <Link
            href={homesHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline focus-ring whitespace-nowrap"
          >
            {t("seeAll", { count: homes.length })} <ChevronRight size={15} />
          </Link>
        )}
      </div>
      <p className="text-muted-foreground mb-5">{t("homesSubtitle")}</p>

      {homes.length === 0 ? (
        <div className="bg-card p-14 text-center anim-fade">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
            <Building2 size={26} />
          </div>
          <p className="text-muted-foreground">
            {t("noListings", { name: firstName })}
          </p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
            {homes.slice(0, HOMES_PREVIEW).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
          {homes.length > HOMES_PREVIEW && (
            <div className="mt-6 flex justify-center">
              <Button asChild variant="secondary" size="lg" className="h-11 gap-1.5">
                <Link href={homesHref}>
                  {t("seeAllHomes", { count: homes.length, name: firstName })}
                  <ChevronRight size={17} />
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* Heading + subtitle + a preview-sized card row, matching the real footprint. */
export function OwnerHomesSkeleton() {
  return (
    <section className="mt-12" aria-busy="true">
      <Skeleton className="skeleton h-8 w-64" />
      <Skeleton className="skeleton mt-2 mb-5 h-5 w-80 max-w-full" />
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: HOMES_PREVIEW }).map((_, i) => (
          <SkeletonListingCard key={i} />
        ))}
      </div>
    </section>
  );
}
