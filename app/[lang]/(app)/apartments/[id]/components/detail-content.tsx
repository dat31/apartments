import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { DetailView } from "./detail-view";
import { JsonLd } from "@/components/json-ld";
import { listingJsonLd } from "../lib/json-ld";
import { createClient } from "@/lib/supabase/server";
import { getListingById } from "@/lib/services/listings";
import type { Locale } from "@/i18n/routing";

/* The listing-dependent half of the detail page. Lives below a Suspense
   boundary so the page's shell (container + back link) renders instantly and
   only this streams in. getListingById is cached, so on navigation the stream
   is effectively immediate. */
export async function DetailContent({ id }: { id: string }) {
  // Listings come from Supabase; an unknown id (or a non-active listing RLS
  // hides) resolves to null and 404s.
  const listing = await getListingById(id);
  if (!listing) notFound();

  // Is the viewer the host of this listing? Real listings store the owner's
  // auth uuid (see toListing), so a direct id match is enough to hide the
  // "book a tour" CTA and label the listing as their own.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === listing.owner;

  // schema.org markup streams with the content; Google indexes the streamed
  // HTML, so living below the Suspense boundary is fine.
  const lang = (await getLocale()) as Locale;
  const t = await getTranslations();

  return (
    <>
      <JsonLd
        data={listingJsonLd(listing, lang, {
          home: t("common.home"),
          apartments: t("apartments.heading"),
        })}
      />
      <DetailView listing={listing} isOwner={isOwner} />
    </>
  );
}
