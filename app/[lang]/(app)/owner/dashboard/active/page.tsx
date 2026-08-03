import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { ListingsTab } from "../components/listings-tab";
import { SkeletonListingRows } from "../components/skeleton-listing-row";

export default async function ActivePage({
  params,
}: PageProps<"/[lang]/owner/dashboard/active">) {
  const { lang } = await params;
  setRequestLocale(lang);

  return (
    <Suspense fallback={<SkeletonListingRows />}>
      <ListingsTab filter="active" />
    </Suspense>
  );
}
