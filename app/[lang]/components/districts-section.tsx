import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getDistrictShowcase } from "@/lib/services/listings";
import { SectionHeader } from "./section-header";
import { DistrictTiles } from "./district-tiles";

/* "Browse by district" — its header (static translated text) renders with the
   page shell, while the data-driven tiles stream behind Suspense. Data comes
   from getDistrictShowcase, a 30-minute cache boundary. */
export async function DistrictsSection() {
  const t = await getTranslations("landing.showcase");
  return (
    <section>
      <SectionHeader
        icon={<MapPin size={18} />}
        title={t("districtsTitle")}
        sub={t("districtsSub")}
      />
      <Suspense fallback={<DistrictTilesSkeleton />}>
        <DistrictTilesData />
      </Suspense>
    </section>
  );
}

async function DistrictTilesData() {
  const tiles = await getDistrictShowcase();
  return <DistrictTiles tiles={tiles} />;
}

function DistrictTilesSkeleton() {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="skeleton min-h-40 w-full rounded-xl" />
      ))}
    </div>
  );
}
