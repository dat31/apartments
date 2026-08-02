import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { DetailView } from "./detail-view";
import { JsonLd } from "@/components/json-ld";
import { listingJsonLd } from "../lib/json-ld";
import { getListingDetail } from "@/lib/services/listings";
import { localizeListing } from "@/schemas/listing";
import type { Locale } from "@/i18n/routing";

/* The listing-dependent half of the detail page. Lives below a Suspense
   boundary so the page's shell (container + back link) renders instantly and
   only this streams in. getListingById is cached, so on navigation the stream
   is effectively immediate. */
export async function DetailContent({ id }: { id: string }) {
  // Listings come from Supabase; an unknown id (or a non-active listing RLS
  // hides) resolves to null and 404s. `now` is the cache boundary's reference
  // time for the JSON-LD availability — see getListingDetail for why the clock
  // can't be read out here.
  const { listing, now } = await getListingDetail(id);
  if (!listing) notFound();

  // Whether the viewer is this listing's host is decided client-side (see
  // ./viewer-is-owner): reading the session here would opt the route out of
  // prerendering for what is only cosmetic chrome.

  // schema.org markup streams with the content; Google indexes the streamed
  // HTML, so living below the Suspense boundary is fine.
  const lang = (await getLocale()) as Locale;
  const t = await getTranslations();

  /* Resolve the owner-authored copy once, here, where the listing enters the
     tree — everything below reads plain `title`/`desc` and stays unaware that
     a listing has more than one language. */
  const shown = localizeListing(listing, lang);

  return (
    <>
      <JsonLd
        data={listingJsonLd(
          shown,
          lang,
          { home: t("common.home"), apartments: t("apartments.heading") },
          now
        )}
      />
      <DetailView listing={shown} />
    </>
  );
}
