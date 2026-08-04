import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ListingRow } from "./listing-row";
import { listMyListings } from "@/lib/services/listings";
import { writtenLocales } from "@/schemas/listing";
import { Building2, Globe, Plus } from "lucide-react";

type Filter = "all" | "active" | "drafts";

const EMPTY_TITLE_KEY: Record<Filter, string> = {
  all: "emptyAll",
  active: "emptyActive",
  drafts: "emptyDrafts",
};

/* Owner-listing list for the overview / active / drafts tabs.

   Reads the owner's listings on the server, so the rows are in the HTML and
   there is no `ready` gate: the old client version rendered null until
   react-query resolved, which is the "return null, then everything" flash
   this replaces. The tab pages wrap it in the <Suspense> that streams it.

   The listings arrive in the owner's own words — listMyListings is
   deliberately not localized (see fetchMyListings), because the same copy
   feeds the edit form, and resolving it here would eventually overwrite the
   original with its own translation. */
export async function ListingsTab({ filter }: { filter: Filter }) {
  const t = await getTranslations("dashboard");
  const listings = await listMyListings();

  const shown =
    filter === "active"
      ? listings.filter((l) => l.status === "active")
      : filter === "drafts"
        ? listings.filter((l) => l.status === "draft")
        : listings;

  if (shown.length === 0) {
    return (
      <div className="bg-card p-16 text-center anim-fade">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
          <Building2 size={26} />
        </div>
        <h3 className="text-lg font-semibold">
          {t(`listings.${EMPTY_TITLE_KEY[filter]}`)}
        </h3>
        <p className="mt-1 text-muted-foreground">
          {t("listings.emptyBody")}
        </p>
        <Button asChild className="mt-5">
          <Link href="/apartments/create">
            <Plus size={18} /> {t("newListing")}
          </Link>
        </Button>
      </div>
    );
  }

  /* "Three of five translated" is either useful or guilt-inducing, and the
     difference is entirely in how it's said — so it's said as a fact about
     what readers get, over the owner's whole set rather than per row. */
  const multilingual = listings.filter((l) => writtenLocales(l).length > 1).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-start gap-2 text-sm text-muted-foreground text-pretty">
        <Globe size={15} className="shrink-0 mt-0.5" />
        <span>
          {multilingual === 0
            ? t("listings.langSummaryNone")
            : t("listings.langSummary", { count: multilingual })}
        </span>
      </p>
      {shown.map((l) => (
        <ListingRow key={l.id} listing={l} />
      ))}
    </div>
  );
}
