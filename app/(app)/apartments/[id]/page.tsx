import { notFound } from "next/navigation";
import { DetailView } from "./components/detail-view";
import { getListingById } from "@/lib/services/listings";
import {
  getListing,
  getOwner,
  reviewsFor,
  SEED_REVIEWS,
} from "@/lib/data/listings";

export default async function ApartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Live listings come from Supabase; legacy seed ids (e.g. links from the
  // landing/saved pages) fall back to the in-memory seed data.
  const listing = (await getListingById(id)) ?? getListing(id);
  if (!listing) notFound();

  const owner = getOwner(listing.owner) ?? null;
  const reviews = reviewsFor(SEED_REVIEWS, listing.owner);

  return <DetailView listing={listing} reviews={reviews} owner={owner} />;
}
