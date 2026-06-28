import { notFound } from "next/navigation";
import { DetailView } from "./detail-view";
import { getListingById } from "@/lib/services/listings";
import {
  getListing,
  getOwner,
  reviewsFor,
  SEED_REVIEWS,
} from "@/lib/data/listings";

/* The listing-dependent half of the detail page. Lives below a Suspense
   boundary so the page's shell (container + back link) renders instantly and
   only this streams in. getListingById is cached, so on navigation the stream
   is effectively immediate. */
export async function DetailContent({ id }: { id: string }) {
  // Live listings come from Supabase; legacy seed ids (e.g. links from the
  // landing/saved pages) fall back to the in-memory seed data.
  const listing = (await getListingById(id)) ?? getListing(id);
  if (!listing) notFound();

  const owner = getOwner(listing.owner) ?? null;
  const reviews = reviewsFor(SEED_REVIEWS, listing.owner);

  return <DetailView listing={listing} reviews={reviews} owner={owner} />;
}
