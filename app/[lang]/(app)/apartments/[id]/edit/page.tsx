import { setRequestLocale } from "next-intl/server";
import { ListingForm } from "../../components/listing-form";
import { getActiveListings } from "@/lib/services/listings";
import { privateMetadata } from "@/lib/seo";

// The edit form itself is private (auth-gated, noindexed) and hydrates the
// listing client-side, so the prerendered shell is identical for every id.
// We still statically generate that shell for each active listing — same set
// the detail route prerenders — so the (app) layout's static locale/header
// resolve at build time instead of forcing the whole route dynamic (which
// would make next-intl read an uncached locale in the shared header). Listings
// created after the build render on demand (dynamicParams defaults to true).
// If Supabase is unreachable at build time, prerender nothing and let every
// edit page render on demand.
export async function generateStaticParams() {
  try {
    const listings = await getActiveListings();
    return listings.map((l) => ({ id: l.id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/apartments/[id]/edit">) {
  const { lang } = await params;
  return privateMetadata(lang, "edit");
}

export default async function EditApartmentPage({
  params,
}: PageProps<"/[lang]/apartments/[id]/edit">) {
  const { lang, id } = await params;
  setRequestLocale(lang);
  return <ListingForm mode="edit" listingId={id} />;
}
