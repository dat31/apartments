import { Suspense } from "react";
import { BackToResults } from "./components/back-to-results";
import { DetailContent } from "./components/detail-content";
import { DetailSkeleton } from "./components/detail-skeleton";

export default function ApartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Static shell: the container and back link never read `params`, so they
  // prerender and paint instantly on navigation. Only the params-dependent
  // content streams in below the Suspense boundary, replacing the old
  // full-screen loader flash with a layout-shaped skeleton.
  return (
    <div className="container mx-auto px-5 sm:px-8 pt-6 pb-28 md:pb-6">
      <BackToResults />
      <Suspense fallback={<DetailSkeleton />}>
        <DetailContent params={params} />
      </Suspense>
    </div>
  );
}
