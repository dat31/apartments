import { ListingForm } from "../../components/listing-form";
import { privateMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/apartments/[id]/edit">) {
  const { lang } = await params;
  return privateMetadata(lang, "edit");
}

// The edit route is private (auth-gated) and noindexed, so there's nothing to
// prerender — every request renders on demand (dynamicParams defaults to true).
export function generateStaticParams() {
  return [];
}

export default async function EditApartmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingForm mode="edit" listingId={id} />;
}
