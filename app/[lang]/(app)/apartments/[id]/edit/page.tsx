import { ListingForm } from "../../components/listing-form";
import { getActiveListings } from "@/lib/services/listings";
import { privateMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/apartments/[id]/edit">) {
  const { lang } = await params;
  return privateMetadata(lang, "edit");
}

// Prewarm the edit shell for every live Supabase listing; unknown ids render
// on-demand (dynamicParams defaults to true). Fall back to on-demand-only if
// Supabase is unreachable at build time.
export async function generateStaticParams() {
  try {
    const live = await getActiveListings();
    return live.map((l) => ({ id: l.id }));
  } catch {
    return [];
  }
}

export default async function EditApartmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingForm mode="edit" listingId={id} />;
}
