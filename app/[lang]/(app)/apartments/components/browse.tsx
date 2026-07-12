import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getActiveListings } from "@/lib/services/listings";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonGrid } from "@/components/skeleton-listing-card";
import { FiltersPanel } from "./filters-panel";
import { OwnerFilterBanner } from "./owner-filter-banner";
import { SortMenu } from "./sort-menu";
import { FilterCountBadge } from "./filter-count-badge";
import { RememberSearch } from "./remember-search";
import { RecentlyViewed } from "./recently-viewed";
import { Listing } from "./listing";
import {
  filterListings,
  getDistricts,
  parseFilters,
  parseSort,
  type SearchParams,
} from "../lib/query";

/* The page is split into a static shell (heading, filters, sort, layout) and a
   few searchParams-dependent islands. The shell never reads the URL, so it
   prerenders and is restored instantly on back-navigation; only the islands
   re-stream — and since getActiveListings() is cached, that stream is instant.
   This is why navigating back from a detail page no longer flashes the whole
   page skeleton. */

/** Filtered + sorted results for the current URL. Shared by every island;
    getActiveListings() is cached so the repeated calls collapse to one read. */
async function getResults(searchParams: Promise<SearchParams>) {
  const [listings, sp] = await Promise.all([getActiveListings(), searchParams]);
  return filterListings(listings, parseFilters(sp), parseSort(sp));
}

export async function Browse({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // districts come from the cached listings, not the URL, so the shell stays static.
  const districts = getDistricts(await getActiveListings());
  const t = await getTranslations("apartments");

  return (
    <div className="container mx-auto px-5 sm:px-8 py-8">
      <RememberSearch />
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("heading")}
          </h1>
          <Suspense
            fallback={<Skeleton className="skeleton mt-1 h-5 w-44" />}
          >
            <ResultsSummary searchParams={searchParams} />
          </Suspense>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {t("sort")}
          </span>
          <SortMenu />
        </div>
      </div>

      {/* Recently-viewed strip — a client island that hydrates from
          localStorage; full-width above the filters + results, renders nothing
          until there's history. */}
      <RecentlyViewed />

      <div className="flex gap-8">
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 bg-sidebar text-sidebar-foreground p-6">
            <h3 className="text-base font-semibold mb-5 flex items-center gap-2">
              <SlidersHorizontal size={18} /> {t("filters")}
            </h3>
            <FiltersPanel districts={districts} />
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-5 lg:hidden">
            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  variant="secondary"
                  size="default"
                  className="h-9 gap-1.5 px-3"
                >
                  <SlidersHorizontal size={16} /> {t("filters")}
                  <FilterCountBadge />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader className="px-6 pt-6 pb-4">
                  <DrawerTitle className="text-xl font-semibold tracking-tight">
                    {t("filters")}
                  </DrawerTitle>
                </DrawerHeader>
                <div className="px-6 pb-6 overflow-y-auto">
                  <FiltersPanel districts={districts} />
                </div>
                <DrawerFooter className="px-6 py-4 bg-muted">
                  <DrawerClose asChild>
                    <Button className="w-full h-11">
                      <Suspense fallback={t("showHomesShort")}>
                        <ShowCount searchParams={searchParams} />
                      </Suspense>
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {t("sort")}
              </span>
              <SortMenu />
            </div>
          </div>

          <Suspense fallback={null}>
            <OwnerFilterBanner searchParams={searchParams} />
          </Suspense>

          <Suspense fallback={<SkeletonGrid count={6} />}>
            <Results searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

/* ---- searchParams-dependent islands ---- */

async function ResultsSummary({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const results = await getResults(searchParams);
  const t = await getTranslations("apartments");
  return (
    <p className="mt-1 text-muted-foreground">
      {t("summary", { count: results.length })}
    </p>
  );
}

async function ShowCount({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const results = await getResults(searchParams);
  const t = await getTranslations("apartments");
  return <>{t("showHomes", { count: results.length })}</>;
}

async function Results({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const results = await getResults(searchParams);
  return <Listing results={results} searchParams={await searchParams} />;
}
