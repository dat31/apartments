import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PreviewContent } from "./components/preview-content";
import { DetailSkeleton } from "../components/detail-skeleton";
import { shellParams } from "../lib/shell-params";
import { privateMetadata } from "@/lib/seo";

/* The owner's view of their own unpublished listing.

   A draft is invisible to the public detail route by design: that route reads
   through the cookieless anon client inside a "use cache" boundary, and RLS
   only hands anon `status = 'active'` rows — so /apartments/[id] 404s for a
   draft and should keep doing so. Teaching it otherwise would mean reading
   cookies on the site's most-visited route and losing its prerender.

   So the owner gets their own route instead. It reads the listing as the
   signed-in user (RLS: `auth.uid() = owner_id` covers drafts), renders the
   very same DetailView, and is dynamic — which is fine here, because it is
   one owner looking at one of their own homes.

   Only the draft state lives here: an active listing redirects to its public
   URL, so a live home never has two addresses. */

/* The shell below reads nothing per-listing, so it is the same for every id —
   but it still has to be *prerendered* for at least one param, or the route
   goes fully dynamic and next-intl resolves the locale uncached inside the
   shared site header, which is an error under cacheComponents. So it
   prerenders one frame per locale under an id no listing can have, the same
   as the /edit route — see ../lib/shell-params.ts. Drafts, the listings this
   page is actually for, render on demand (dynamicParams defaults to true). */
export const generateStaticParams = shellParams;

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/apartments/[id]/preview">) {
  const { lang } = await params;
  return privateMetadata(lang, "preview");
}

export default async function ListingPreviewPage({
  params,
}: PageProps<"/[lang]/apartments/[id]/preview">) {
  // Same shape as the public detail page: params resolve here so the shell
  // stays static per locale, and every cookie-bound read streams in below the
  // Suspense boundary as a layout-shaped skeleton.
  const { lang, id } = await params;
  setRequestLocale(lang);
  const t = await getTranslations("detail");

  return (
    <div className="container mx-auto px-5 sm:px-8 pt-6 pb-28 md:pb-6">
      <Suspense fallback={<DetailSkeleton label={t("loadingHome")} />}>
        <PreviewContent id={id} />
      </Suspense>
    </div>
  );
}
