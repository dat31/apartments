import { SEED_LISTINGS } from "@/lib/data/listings";
import { ListingCard } from "@/components/listing-card";
import { EmptyResults } from "./empty-results";
import { ListingPagination } from "./listing-pagination";
import {
  filterListings,
  parseFilters,
  parsePage,
  parseSort,
  PAGE_SIZE,
  type SearchParams,
} from "../lib/query";

/* Server-rendered result list. Reads the query straight off the URL, so the
   whole grid (and each card) renders on the server. Marked async so the
   wrapping <Suspense> shows its skeleton while results resolve. */
export async function Listing({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = parseFilters(searchParams);
  const sort = parseSort(searchParams);
  const results = filterListings(SEED_LISTINGS, filters, sort);

  if (results.length === 0) return <EmptyResults />;

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(parsePage(searchParams), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const pageResults = results.slice(start, start + PAGE_SIZE);

  return (
    <>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
        {pageResults.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
      {totalPages > 1 && (
        <ListingPagination
          page={page}
          totalPages={totalPages}
          total={results.length}
        />
      )}
    </>
  );
}
