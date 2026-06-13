import { notFound } from "next/navigation";
import { DetailView } from "./components/detail-view";
import {
  getListing,
  getOwner,
  reviewsFor,
  SEED_REVIEWS,
  SEED_LISTINGS,
} from "@/lib/data/listings";

export function generateStaticParams() {
  return SEED_LISTINGS.map((l) => ({ id: l.id }));
}

export default async function ApartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = getListing(id);
  if (!listing) notFound();

  const owner = getOwner(listing.owner) ?? null;
  const reviews = reviewsFor(SEED_REVIEWS, listing.owner);

  return <DetailView listing={listing} reviews={reviews} owner={owner} />;
}
