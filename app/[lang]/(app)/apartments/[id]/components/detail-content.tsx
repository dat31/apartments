import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { DetailView } from "./detail-view";
import { JsonLd } from "@/components/json-ld";
import { listingJsonLd } from "../lib/json-ld";
import { getListingById } from "@/lib/services/listings";
import type { Locale } from "@/i18n/routing";

/* The listing-dependent half of the detail page. Everything here reads only
   cached Supabase data ("use cache" services), so the whole listing — title,
   facts, JSON-LD — lands in the static prerender. The per-viewer bits (is this
   the host?) resolve inside their own Suspense boundaries further down
   (BookTourGate, OwnerCard), keeping the cookie reads out of this subtree. */
export async function DetailContent({ id }: { id: string }) {
  // Listings come from Supabase only; an unknown id (never-existed or removed)
  // 404s.
  const listing = await getListingById(id);
  if (!listing) notFound();

  // No reviews table yet, so there is no real review data to show — the
  // Reviews block renders its empty state. Wire a reviews service here when
  // the table lands. The host card and the "Similar homes" row each fetch
  // their own data below their own Suspense boundaries (see DetailView), so
  // neither query blocks the main listing content.

  // schema.org markup prerenders with the content.
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
      <DetailView listing={listing} reviews={[]} />
    </>
  );
}
