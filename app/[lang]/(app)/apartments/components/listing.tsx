import { type Listing as ListingType } from "@/schemas/listing";
import { ListingCard } from "@/components/listing-card";
import { EmptyResults } from "./empty-results";
import { ListingPagination } from "./listing-pagination";
import { parsePage, PAGE_SIZE, type SearchParams } from "../lib/query";

/* Server-rendered result grid. Receives the already-filtered results from
   <Browse> and handles pagination off the URL, so the whole grid (and each
   card) renders on the server. */
export function Listing({
  results,
  searchParams,
}: {
  results: ListingType[];
  searchParams: SearchParams;
}) {
  if (results.length === 0) return <EmptyResults />;

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(parsePage(searchParams), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const pageResults = results.slice(start, start + PAGE_SIZE);

  return (
    <>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
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
