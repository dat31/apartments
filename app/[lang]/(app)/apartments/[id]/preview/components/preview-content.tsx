import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { DetailView } from "../../components/detail-view";
import { PreviewBanner } from "./preview-banner";
import { getMyListingById } from "@/lib/services/listings";
import { getSessionUser } from "@/lib/services/session";
import { localizeListing } from "@/schemas/listing";
import type { Locale } from "@/i18n/routing";

/* The cookie-bound half of the preview page, below its Suspense boundary.

   No JSON-LD and no `now`: a draft is not indexable and carries no public
   availability offer, which is the only thing the detail page needs a cache
   boundary's clock for. */
export async function PreviewContent({ id }: { id: string }) {
  const lang = (await getLocale()) as Locale;

  /* The middleware redirects anonymous visitors here to /signin, so this is
     belt-and-braces — but getMyListingById would throw rather than 404 if one
     ever arrived, and a missing session is a "nothing to see", not an error. */
  if (!(await getSessionUser())) notFound();

  // Someone else's listing reads as not-found, exactly as a bad id does: the
  // owner filter is in the query, and RLS refuses it a second time.
  const listing = await getMyListingById(id);
  if (!listing) notFound();

  // A published home already has a public page, and that one is cached,
  // indexable and shareable. Preview is only for what isn't live yet.
  if (listing.status === "active") redirect({ href: `/apartments/${id}`, locale: lang });

  const t = await getTranslations("dashboard.preview");

  return (
    <>
      <PreviewBanner
        title={t("title")}
        body={t("body")}
        back={t("back")}
        edit={t("edit")}
        listingId={id}
      />
      <DetailView listing={localizeListing(listing, lang)} preview />
    </>
  );
}
