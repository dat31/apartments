"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { ReviewCard } from "@/components/review-card";
import { SkeletonReviewCard } from "@/components/skeleton-review-card";
import { useReviewPage } from "@/hooks/use-review-page";
import { REVIEWS_PER_PAGE } from "../lib/reviews";

/* Reviews pager. Page 1 is the server-rendered `firstPage` (in the static
   HTML); every other page is fetched from the browser by row range, so no
   navigation or server round-trip is needed to browse reviews — and the page
   ships four cards instead of an owner's whole review history. */
export function ReviewPager({
  ownerId,
  total,
  pageCount,
  firstPage,
}: {
  ownerId: string;
  total: number;
  pageCount: number;
  firstPage: React.ReactNode;
}) {
  const t = useTranslations("detail.reviews");
  const [page, setPage] = React.useState(1);
  const { data, isPending, isError } = useReviewPage(ownerId, page, true);

  // Rows this page will hold — a full page everywhere but the last. Used to
  // size the placeholder grid so the layout doesn't jump while it loads.
  const rows = Math.min(
    REVIEWS_PER_PAGE,
    Math.max(0, total - (page - 1) * REVIEWS_PER_PAGE)
  );

  return (
    <>
      {page === 1 ? (
        firstPage
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 stagger">
          {isPending || isError || !data
            ? Array.from({ length: rows }).map((_, i) => (
                <SkeletonReviewCard key={i} />
              ))
            : data.map((r) => <ReviewCard key={r.id} r={r} />)}
        </div>
      )}

      {pageCount > 1 && (
        <Pagination
          aria-label={t("pagination")}
          className="mt-6 justify-center"
        >
          <PaginationContent>
            <PaginationItem key="prev">
              <PaginationPrevious
                href="#"
                text={t("prev")}
                aria-disabled={page <= 1}
                className={cn(page <= 1 && "pointer-events-none opacity-40")}
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.max(1, p - 1));
                }}
              />
            </PaginationItem>
            {Array.from({ length: pageCount }).map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  isActive={i + 1 === page}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(i + 1);
                  }}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem key="next">
              <PaginationNext
                href="#"
                text={t("next")}
                aria-disabled={page >= pageCount}
                className={cn(page >= pageCount && "pointer-events-none opacity-40")}
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.min(pageCount, p + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}
