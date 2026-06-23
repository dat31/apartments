"use client";

import { type Listing, availLabel } from "@/lib/data/listings";

/* The availability label compares the listing date against "now", so it must
   be computed at request time on the client rather than baked into the static
   prerender. */
export function AvailabilityLabel({ listing }: { listing: Listing }) {
  return <>{availLabel(listing)}</>;
}
