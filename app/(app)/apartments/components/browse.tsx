"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { ListingCard } from "@/components/listing-card";
import { FiltersPanel } from "./filters-panel";
import { IconSliders, IconSearch } from "@/components/icons";
import { useSaved } from "@/hooks/use-saved";
import { type Listing } from "@/lib/data/listings";
import {
  DEFAULT_FILTERS,
  type Filters,
  type SortKey,
} from "../schemas/filters";

const PAGE_SIZE = 6;

export function Browse({ listings }: { listings: Listing[] }) {
  const { isSaved, toggleSave } = useSaved();
  const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = React.useState<SortKey>("featured");
  const [mobileFilters, setMobileFilters] = React.useState(false);
  const [page, setPage] = React.useState(1);

  const results = React.useMemo(() => {
    let r = listings.filter((l) => l.status === "active");
    const q = filters.q.trim().toLowerCase();
    if (q)
      r = r.filter((l) =>
        (l.title + l.neighborhood + l.city + l.type).toLowerCase().includes(q)
      );
    if (filters.type !== "All") r = r.filter((l) => l.type === filters.type);
    if (filters.district !== "All")
      r = r.filter((l) => l.neighborhood === filters.district);
    if (filters.minPrice) r = r.filter((l) => l.price >= +filters.minPrice);
    if (filters.maxPrice) r = r.filter((l) => l.price <= +filters.maxPrice);
    if (filters.beds !== "Any") {
      if (filters.beds === "Studio") r = r.filter((l) => l.beds === 0);
      else if (filters.beds === "3+") r = r.filter((l) => l.beds >= 3);
      else r = r.filter((l) => l.beds === +filters.beds);
    }
    if (filters.amenities.length)
      r = r.filter((l) =>
        filters.amenities.every((a) => l.amenities.includes(a))
      );
    if (sort === "low") r = [...r].sort((a, b) => a.price - b.price);
    else if (sort === "high") r = [...r].sort((a, b) => b.price - a.price);
    else if (sort === "area") r = [...r].sort((a, b) => b.area - a.area);
    return r;
  }, [listings, filters, sort]);

  const districts = React.useMemo(
    () =>
      [
        ...new Set(
          listings
            .filter((l) => l.status === "active")
            .map((l) => l.neighborhood)
        ),
      ].sort(),
    [listings]
  );

  const activeCount =
    Number(filters.type !== "All") +
    Number(filters.district !== "All") +
    Number(!!filters.minPrice) +
    Number(!!filters.maxPrice) +
    Number(filters.beds !== "Any") +
    filters.amenities.length;

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));

  // Reset to page 1 whenever the result set changes (filter/sort/search),
  // adjusting state during render per the React-recommended pattern.
  const sig = JSON.stringify([filters, sort]);
  const [prevSig, setPrevSig] = React.useState(sig);
  if (sig !== prevSig) {
    setPrevSig(sig);
    setPage(1);
  }

  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageResults = results.slice(start, start + PAGE_SIZE);
  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(p, 1), totalPages));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Homes in Portland
        </h1>
        <p className="mt-1 text-muted-foreground">
          {results.length} place{results.length !== 1 ? "s" : ""} available to
          rent
        </p>
      </div>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 bg-sidebar text-sidebar-foreground p-6">
            <h3 className="text-base font-semibold mb-5 flex items-center gap-2">
              <IconSliders size={18} /> Filters
            </h3>
            <FiltersPanel
              filters={filters}
              setFilters={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
              districts={districts}
            />
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-5">
            <Button
              variant="secondary"
              size="default"
              className="lg:hidden h-9 gap-1.5 px-3"
              onClick={() => setMobileFilters(true)}
            >
              <IconSliders size={16} /> Filters
              {activeCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs bg-primary text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Sort
              </span>
              <Select
                value={sort}
                onValueChange={(v) => setSort(v as SortKey)}
              >
                <SelectTrigger className="h-11 bg-input border-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="low">Price: low to high</SelectItem>
                  <SelectItem value="high">Price: high to low</SelectItem>
                  <SelectItem value="area">Largest area</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="bg-card p-16 text-center anim-fade">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
                <IconSearch size={26} />
              </div>
              <h3 className="text-lg font-semibold">
                No homes match those filters
              </h3>
              <p className="mt-1 text-muted-foreground">
                Try widening your price range or clearing a filter.
              </p>
              <Button
                variant="secondary"
                className="mt-5 h-11"
                onClick={() => setFilters(DEFAULT_FILTERS)}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
                {pageResults.map((l) => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    saved={isSaved(l.id)}
                    onToggleSave={toggleSave}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-10 flex flex-col items-center gap-3">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          text="Prev"
                          aria-disabled={safePage <= 1}
                          className={cn(
                            safePage <= 1 && "pointer-events-none opacity-40"
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            goToPage(safePage - 1);
                          }}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            href="#"
                            isActive={i + 1 === safePage}
                            onClick={(e) => {
                              e.preventDefault();
                              goToPage(i + 1);
                            }}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          aria-disabled={safePage >= totalPages}
                          className={cn(
                            safePage >= totalPages &&
                              "pointer-events-none opacity-40"
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            goToPage(safePage + 1);
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    Showing {start + 1}–
                    {Math.min(start + PAGE_SIZE, results.length)} of{" "}
                    {results.length}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={mobileFilters} onOpenChange={setMobileFilters}>
        <DialogContent className="max-w-md p-0 gap-0 max-h-[85vh] flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Filters
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto">
            <FiltersPanel
              filters={filters}
              setFilters={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
              districts={districts}
            />
          </div>
          <DialogFooter className="px-6 py-4 bg-muted">
            <Button
              className="w-full h-11"
              onClick={() => setMobileFilters(false)}
            >
              Show {results.length} homes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
