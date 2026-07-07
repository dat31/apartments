import { ListingForm } from "../../components/listing-form";
import { SEED_LISTINGS } from "@/lib/data/listings";
import { privateMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/apartments/[id]/edit">) {
  const { lang } = await params;
  return privateMetadata(lang, "edit");
}

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
