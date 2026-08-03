import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { ListingsTab } from "../components/listings-tab";
import { SkeletonListingRows } from "../components/skeleton-listing-row";

/* setRequestLocale here as well as in the layout, and it is load-bearing:
   ListingsTab calls getTranslations(), and without the locale pinned for
   *this* segment next-intl resolves it from the request instead. That read
   is attributed to the enclosing render rather than to the Suspense boundary
   below, and Next rejects the route as blocking. The <Suspense> is what keeps
   the owner's own listings — cookie-bound — out of the static shell. */
export default async function OverviewPage({
  params,
}: PageProps<"/[lang]/owner/dashboard/overview">) {
  const { lang } = await params;
  setRequestLocale(lang);

  return (
    <Suspense fallback={<SkeletonListingRows />}>
      <ListingsTab filter="all" />
    </Suspense>
  );
}
