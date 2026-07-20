import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BookTourButton } from "./book-tour-button";
import { viewerOwns } from "../lib/viewer-owns";
import { type Listing } from "@/schemas/listing";

/* The "book a tour" CTA, hidden when the viewer is the host. The ownership
   check reads the auth cookie, so it lives below its own Suspense boundary —
   a small per-request hole that keeps the rest of the listing content fully
   prerenderable (DetailContent no longer computes isOwner for the whole
   view). The fallback mirrors BookTourButton's own pending skeleton so the
   booking card doesn't shift when the button lands. */
async function Gate({
  listing,
  mode,
}: {
  listing: Listing;
  mode: "full" | "compact";
}) {
  if (await viewerOwns(listing.owner)) return null;
  return <BookTourButton listing={listing} mode={mode} />;
}

export function BookTourGate({
  listing,
  mode,
}: {
  listing: Listing;
  mode: "full" | "compact";
}) {
  return (
    <Suspense
      fallback={
        mode === "full" ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <Skeleton className="h-11 w-28" />
        )
      }
    >
      <Gate listing={listing} mode={mode} />
    </Suspense>
  );
}
