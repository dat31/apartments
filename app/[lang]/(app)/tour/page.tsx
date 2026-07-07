import { RenterTours } from "./components/renter-tours";
import { privateMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/tour">) {
  const { lang } = await params;
  return privateMetadata(lang, "tours");
}

/* Renter "My tours" — fully client-rendered: tour requests live in
   localStorage and are filtered to the signed-in renter's email. */
export default function TourPage() {
  return <RenterTours />;
}
