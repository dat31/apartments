import { notFound } from "next/navigation";
import { DetailView } from "./detail-view";
import { createClient } from "@/lib/supabase/server";
import { getListingById } from "@/lib/services/listings";
import { getOwnerProfile } from "@/lib/services/owners";
import { getListing, reviewsFor, SEED_REVIEWS } from "@/lib/data/listings";

/* The listing-dependent half of the detail page. Lives below a Suspense
   boundary so the page's shell (container + back link) renders instantly and
   only this streams in. getListingById is cached, so on navigation the stream
   is effectively immediate. */
export async function DetailContent({ id }: { id: string }) {
  // Live listings come from Supabase; legacy seed ids (e.g. links from the
  // landing/saved pages) fall back to the in-memory seed data.
  const listing = (await getListingById(id)) ?? getListing(id);
  if (!listing) notFound();

  const owner = await getOwnerProfile(listing.owner);
  const reviews = reviewsFor(SEED_REVIEWS, listing.owner);

  // Is the viewer the host of this listing? Real listings store the owner's
  // auth uuid (see toListing), so a direct id match is enough to hide the
  // "book a tour" CTA and label the listing as their own.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === listing.owner;

  return (
    <DetailView
      listing={listing}
      reviews={reviews}
      owner={owner}
      isOwner={isOwner}
    />
  );
}
