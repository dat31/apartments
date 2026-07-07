import { ListingForm } from "../components/listing-form";
import { privateMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/apartments/create">) {
  const { lang } = await params;
  return privateMetadata(lang, "create");
}

export default function CreateApartmentPage() {
  return <ListingForm mode="create" />;
}
