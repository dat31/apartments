import { ListingForm } from "../../components/listing-form";
import { getActiveListings } from "@/lib/services/listings";
import { privateMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/apartments/[id]/edit">) {
  const { lang } = await params;
  return privateMetadata(lang, "edit");
}

export async function generateStaticParams() {
  const listings = await getActiveListings();
  return listings.map((l) => ({ id: l.id }));
}

export default async function EditApartmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingForm mode="edit" listingId={id} />;
}
