"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { SkeletonGrid } from "@/components/skeleton-listing-card";
import { useSaved } from "@/hooks/use-saved";
import { IconHeart, IconSearch } from "@/components/icons";
import { type Listing } from "@/lib/data/listings";

export function SavedList({ listings }: { listings: Listing[] }) {
  const { saved, isSaved, toggleSave, ready } = useSaved();
  const savedListings = React.useMemo(
    () => saved.map((id) => listings.find((l) => l.id === id)).filter(Boolean) as Listing[],
    [listings, saved]
  );

  return (
    <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2.5">
            <IconHeart size={26} className="text-primary" /> Saved homes
          </h1>
          <p className="mt-1 text-muted-foreground">
            {savedListings.length === 0
              ? "Homes you save will collect here."
              : `${savedListings.length} home${
                  savedListings.length !== 1 ? "s" : ""
                } you're keeping an eye on`}
          </p>
        </div>
        {savedListings.length > 0 && (
          <Button asChild variant="secondary" className="h-11 gap-1.5">
            <Link href="/apartments">
              <IconSearch size={16} /> Keep browsing
            </Link>
          </Button>
        )}
      </div>

      {!ready ? (
        <SkeletonGrid count={3} />
      ) : savedListings.length === 0 ? (
        <div className="bg-card p-16 text-center anim-fade">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
            <IconHeart size={26} />
          </div>
          <h3 className="text-lg font-semibold">No saved homes yet</h3>
          <p className="mt-1 text-muted-foreground text-pretty max-w-sm mx-auto">
            Tap the heart on any listing to save it. Your shortlist stays here so
            you can compare and revisit.
          </p>
          <Button asChild className="mt-5 h-11 gap-1.5">
            <Link href="/apartments">
              <IconSearch size={16} /> Browse homes
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
          {savedListings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              saved={isSaved(l.id)}
              onToggleSave={toggleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
