import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { OwnerTours } from "../components/owner-tours";
import { SkeletonTourCards } from "../components/skeleton-tour-card";

export default async function ToursPage({
  params,
}: PageProps<"/[lang]/owner/dashboard/tours">) {
  const { lang } = await params;
  setRequestLocale(lang);

  return (
    <Suspense fallback={<SkeletonTourCards />}>
      <OwnerTours />
    </Suspense>
  );
}
