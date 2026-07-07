"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ListingRow } from "./listing-row";
import { useListings } from "@/hooks/use-listings";
import { Building2, Plus } from "lucide-react";

type Filter = "all" | "active" | "drafts";

const EMPTY_TITLE_KEY: Record<Filter, string> = {
  all: "emptyAll",
  active: "emptyActive",
  drafts: "emptyDrafts",
};

/* Owner-listing list for the overview / active / drafts tabs. */
export function ListingsTab({ filter }: { filter: Filter }) {
  const t = useTranslations("dashboard");
  const { listings, toggleStatus, removeListing, ready } = useListings();

  const shown =
    filter === "active"
      ? listings.filter((l) => l.status === "active")
      : filter === "drafts"
        ? listings.filter((l) => l.status === "draft")
        : listings;

  // Avoid flashing the empty state before the owner's listings have loaded.
  if (!ready) return null;

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

  return (
    <div className="flex flex-col gap-3 stagger">
      {shown.map((l) => (
        <ListingRow
          key={l.id}
          listing={l}
          onToggleStatus={toggleStatus}
          onDelete={removeListing}
        />
      ))}
    </div>
  );
}
