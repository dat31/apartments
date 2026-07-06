import { notFound } from "next/navigation";
import { OwnerProfile } from "./components/owner-profile";
import { getListingsByOwner } from "@/lib/services/listings";
import {
  getOwner,
  reviewsFor,
  SEED_REVIEWS,
  OWNERS,
} from "@/lib/data/listings";

export function generateStaticParams() {
  return Object.keys(OWNERS).map((id) => ({ id }));
}

export default async function OwnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const owner = getOwner(id);
  if (!owner) notFound();

  const homes = await getListingsByOwner(id);
  const reviews = reviewsFor(SEED_REVIEWS, id);

  return <OwnerProfile owner={owner} homes={homes} reviews={reviews} />;
}
