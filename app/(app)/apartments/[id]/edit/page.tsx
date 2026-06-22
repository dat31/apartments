import { ListingForm } from "../../components/listing-form";
import { SEED_LISTINGS } from "@/lib/data/listings";

export function generateStaticParams() {
  return SEED_LISTINGS.map((l) => ({ id: l.id }));
}

export default async function EditApartmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingForm mode="edit" listingId={id} />;
}
