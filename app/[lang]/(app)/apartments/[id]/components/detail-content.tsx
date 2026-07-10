import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { DetailView } from "./detail-view";
import { JsonLd } from "@/components/json-ld";
import { listingJsonLd } from "../lib/json-ld";
import { createClient } from "@/lib/supabase/server";
import { getListingById } from "@/lib/services/listings";
import { getListing, reviewsFor, SEED_REVIEWS } from "@/lib/data/listings";
import type { Locale } from "@/i18n/routing";

/* The listing-dependent half of the detail page. Lives below a Suspense
   boundary so the page's shell (container + back link) renders instantly and
   only this streams in. getListingById is cached, so on navigation the stream
   is effectively immediate. */
export async function DetailContent({ id }: { id: string }) {
  // Live listings come from Supabase; legacy seed ids (e.g. links from the
  // landing/saved pages) fall back to the in-memory seed data.
  const live = await getListingById(id);
  const listing = live ?? getListing(id);
  if (!listing) notFound();

  // Reviews are seed data (no reviews table yet) and resolve synchronously.
  // The host card and the "Similar homes" row each fetch their own data below
  // their own Suspense boundaries (see DetailView), so neither query blocks the
  // main listing content.
  const reviews = reviewsFor(SEED_REVIEWS, listing.owner);

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
      <DetailView listing={listing} reviews={reviews} isOwner={isOwner} />
    </>
  );
}
