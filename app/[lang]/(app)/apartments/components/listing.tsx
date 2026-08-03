import { type LocalizedListing } from "@/schemas/listing";
import { ListingCard } from "@/components/listing-card";
import { EmptyResults } from "./empty-results";
import { ListingPagination } from "./listing-pagination";
import {
  parseFilters,
  parsePage,
  unshownMatchLocales,
  PAGE_SIZE,
  type SearchParams,
} from "../lib/query";

/* Server-rendered result grid. Receives the already-filtered results from
   <Browse> and handles pagination off the URL, so the whole grid (and each
   card) renders on the server. */
export function Listing({
  results,
  searchParams,
}: {
  results: LocalizedListing[];
  searchParams: SearchParams;
}) {
  if (results.length === 0) return <EmptyResults />;

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(parsePage(searchParams), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const pageResults = results.slice(start, start + PAGE_SIZE);
  const query = parseFilters(searchParams).q.trim();

  return (
    <>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {pageResults.map((l, i) => {
          /* Computed here rather than in the card: the card is handed copy
             that has already been resolved to one language, and this is the
             one question that needs the languages it isn't showing. Only the
             page's own cards ever ask it. */
          const locales = query ? unshownMatchLocales(l, query) : [];
          return (
            /* The grid tops out at three columns, so the first three cards are
               the only ones reliably above the fold — preload just those covers
               and leave the rest lazy. */
            <ListingCard
              key={l.id}
              listing={l}
              priority={i < 3}
              matchedIn={locales.length ? { query, locales } : undefined}
            />
          );
        })}
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
