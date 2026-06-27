"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ListingRow } from "./listing-row";
import { useListings } from "@/hooks/use-listings";
import { Building2, Plus } from "lucide-react";

type Filter = "all" | "active" | "drafts";

const EMPTY_TITLE: Record<Filter, string> = {
  all: "Nothing here yet",
  active: "No active listings",
  drafts: "No drafts",
};

/* Owner-listing list for the overview / active / drafts tabs. */
export function ListingsTab({ filter }: { filter: Filter }) {
  const { listings, toggleStatus, removeListing } = useListings();

  const mine = listings.filter((l) => l.owner === "you");
  const shown =
    filter === "active"
      ? mine.filter((l) => l.status === "active")
      : filter === "drafts"
        ? mine.filter((l) => l.status === "draft")
        : mine;

  if (shown.length === 0) {
    return (
      <div className="bg-card p-16 text-center anim-fade">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
          <Building2 size={26} />
        </div>
        <h3 className="text-lg font-semibold">{EMPTY_TITLE[filter]}</h3>
        <p className="mt-1 text-muted-foreground">
          Create a listing to start renting out your place.
        </p>
        <Button asChild className="mt-5">
          <Link href="/apartments/create">
            <Plus size={18} /> New listing
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
