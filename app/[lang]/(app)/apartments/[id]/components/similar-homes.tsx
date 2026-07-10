import { useTranslations } from "next-intl";
import { ListingCard } from "@/components/listing-card";
import { districtLabel, type Listing } from "@/schemas/listing";
import { rankSimilar } from "../lib/similar";

/* "Similar homes" row, shown full-width below the detail two-column layout.
   Ranks the active listings pool against the current home and renders the top
   three as the exact browse ListingCard — so save buttons, price formatting,
   and availability labels all come along for free. Each card opens its own
   detail page (which shows its own row), letting renters hop laterally through
   comparable inventory instead of returning to browse.

   Server component: the ranking is a pure in-memory scan, so nothing here is
   interactive and it renders inside the detail page's existing Suspense
   stream. */
export function SimilarHomes({
  listing,
  pool,
}: {
  listing: Listing;
  pool: Listing[];
}) {
  const t = useTranslations("detail.similar");
  const { picks, districtScoped } = rankSimilar(pool, listing);
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
