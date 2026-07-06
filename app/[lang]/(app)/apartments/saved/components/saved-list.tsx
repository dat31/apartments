"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
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
import { ListingCard } from "@/components/listing-card";
import { SkeletonGrid } from "@/components/skeleton-listing-card";
import { useSaved } from "@/hooks/use-saved";
import {
  SAVED_PAGE_SIZE,
  useSavedFacets,
  useSavedListingsPage,
} from "@/hooks/use-saved-listings";
import { Heart, Search, SlidersHorizontal } from "lucide-react";
import { FiltersPanel } from "@/app/[lang]/(app)/apartments/components/filters-panel";
import { SortMenu } from "@/app/[lang]/(app)/apartments/components/sort-menu";
import { EmptyResults } from "@/app/[lang]/(app)/apartments/components/empty-results";
import { SavedPagination } from "./saved-pagination";
import {
  activeFilterCount,
  parseFilters,
  parseSort,
} from "@/app/[lang]/(app)/apartments/lib/query";

/* Saved homes with the same filter/sort UI as Browse. This page has no SEO
   need, so it renders fully client-side. Filter/sort state lives in the URL
   (the shared FiltersPanel / SortMenu islands); pagination is React state.
   Rather than pull every saved listing into the browser and slice, the DB
   returns one filtered/sorted page at a time (useSavedListingsPage), with a
   tiny facets query supplying the district chips + total. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function SavedList() {
  const t = useTranslations("saved");
  const ta = useTranslations("apartments");
  const { saved, ready: savedReady, scope } = useSaved();
  const searchParams = useSearchParams();

  // Guests may still hold legacy non-uuid ids in localStorage; keep only real
  // listing uuids so `.in("id", …)` (a uuid column) never errors.
  const savedIds = React.useMemo(
    () => saved.filter((id) => UUID_RE.test(id)),
    [saved]
  );

  const filters = React.useMemo(
    () => parseFilters(Object.fromEntries(searchParams.entries())),
    [searchParams]
  );
  const sort = parseSort(Object.fromEntries(searchParams.entries()));
  const activeCount = activeFilterCount(filters);

  // Pagination is client state now (no ?page= in the URL). Reset to the first
  // page whenever the filter/sort query string changes.
  const [page, setPage] = React.useState(1);
  const filterKey = searchParams.toString();
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [filterKey]);

  const facets = useSavedFacets({ scope, saved: savedIds, enabled: savedReady });
  const pageQuery = useSavedListingsPage({
    scope,
    saved: savedIds,
    filters,
    sort,
    page,
    enabled: savedReady,
  });

  const savedTotal = facets.data?.total ?? 0;
  const districts = facets.data?.districts ?? [];
  const results = pageQuery.data?.listings ?? [];
  const total = pageQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / SAVED_PAGE_SIZE));

  // Ready once the shortlist and both reads (facets + first page) resolve.
  const ready = savedReady && !facets.isPending && !pageQuery.isPending;

  // Snap back into range if the page fell off the end (e.g. after unsaving).
  React.useEffect(() => {
    if (page > totalPages) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // No saved homes at all — welcoming empty state, no filter chrome.
  if (ready && savedTotal === 0) {
    return (
      <div className="container mx-auto px-5 sm:px-8 py-8">
        <Header count={0} />
        <div className="bg-card p-16 text-center anim-fade">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
            <Heart size={26} />
          </div>
          <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-1 text-muted-foreground text-pretty max-w-sm mx-auto">
            {t("emptyBody")}
          </p>
          <Button asChild className="mt-5 h-11 gap-1.5">
            <Link href="/apartments">
              <Search size={16} /> {t("browseHomes")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-5 sm:px-8 py-8">
      <Header count={savedTotal} showBrowse />

      {!ready ? (
        <SkeletonGrid count={3} />
      ) : (
        <div className="flex gap-8">
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-24 bg-sidebar text-sidebar-foreground p-6">
              <h3 className="text-base font-semibold mb-5 flex items-center gap-2">
                <SlidersHorizontal size={18} /> {ta("filters")}
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
                    <SlidersHorizontal size={16} /> {ta("filters")}
                    {activeCount > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs bg-primary text-primary-foreground">
                        {activeCount}
                      </span>
                    )}
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[85vh]">
                  <DrawerHeader className="px-6 pt-6 pb-4">
                    <DrawerTitle className="text-xl font-semibold tracking-tight">
                      {ta("filters")}
                    </DrawerTitle>
                  </DrawerHeader>
                  <div className="px-6 pb-6 overflow-y-auto">
                    <FiltersPanel districts={districts} />
                  </div>
                  <DrawerFooter className="px-6 py-4 bg-muted">
                    <DrawerClose asChild>
                      <Button className="w-full h-11">
                        {ta("showHomes", { count: total })}
                      </Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {ta("sort")}
                </span>
                <SortMenu />
              </div>
            </div>

            {total === 0 ? (
              <EmptyResults />
            ) : (
              <>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
                  {results.map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <SavedPagination
                    page={Math.min(page, totalPages)}
                    totalPages={totalPages}
                    total={total}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ count, showBrowse }: { count: number; showBrowse?: boolean }) {
  const t = useTranslations("saved");
  const ta = useTranslations("apartments");
  return (
    <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2.5">
          <Heart size={26} className="text-primary" /> {t("title")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {count === 0 ? t("emptyHint") : t("countSub", { count })}
        </p>
      </div>
      {showBrowse && count > 0 && (
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {ta("sort")}
            </span>
            <SortMenu />
          </div>
          <Button asChild variant="ghost" className="h-11 gap-1.5">
            <Link href="/apartments">
              <Search size={16} /> {t("keepBrowsing")}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
