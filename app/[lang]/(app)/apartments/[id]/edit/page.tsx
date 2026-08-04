import { setRequestLocale } from "next-intl/server";
import { ListingForm } from "../../components/listing-form";
import { shellParams } from "../lib/shell-params";
import { privateMetadata } from "@/lib/seo";

// The edit form is private (auth-gated, noindexed) and hydrates the listing
// client-side, so the prerendered shell is identical for every id: one shell
// per locale is all this route needs. See lib/shell-params.ts for why it
// can't simply opt out of prerendering. Real listings render on demand
// (dynamicParams defaults to true).
export const generateStaticParams = shellParams;

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
