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
import { FiltersPanel } from "./filters-panel";
import { SortMenu } from "./sort-menu";
import { Listing } from "./listing";
import {
  activeFilterCount,
  filterListings,
  getDistricts,
  parseFilters,
  parseSort,
  type SearchParams,
} from "../lib/query";

export async function Browse({ searchParams }: { searchParams: SearchParams }) {
  const listings = await getActiveListings();
  const filters = parseFilters(searchParams);
  const sort = parseSort(searchParams);
  const results = filterListings(listings, filters, sort);
  const districts = getDistricts(listings);
  const activeCount = activeFilterCount(filters);

  return (
    <div className="container mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Homes in Da Nang
          </h1>
          <p className="mt-1 text-muted-foreground">
            {results.length} place{results.length !== 1 ? "s" : ""} available to
            rent
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Sort
          </span>
          <SortMenu value={sort} />
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 bg-sidebar text-sidebar-foreground p-6">
            <h3 className="text-base font-semibold mb-5 flex items-center gap-2">
              <SlidersHorizontal size={18} /> Filters
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
                  <SlidersHorizontal size={16} /> Filters
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
                    Filters
                  </DrawerTitle>
                </DrawerHeader>
                <div className="px-6 pb-6 overflow-y-auto">
                  <FiltersPanel districts={districts} />
                </div>
                <DrawerFooter className="px-6 py-4 bg-muted">
                  <DrawerClose asChild>
                    <Button className="w-full h-11">
                      Show {results.length} homes
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Sort
              </span>
              <SortMenu value={sort} />
            </div>
          </div>

          <Listing results={results} searchParams={searchParams} />
        </div>
      </div>
    </div>
  );
}
