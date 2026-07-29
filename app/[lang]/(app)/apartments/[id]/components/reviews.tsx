import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Star } from "lucide-react";
import { ReviewCard } from "@/components/review-card";
import { StarRow } from "@/components/star-row";
import { SkeletonReviewCard } from "@/components/skeleton-review-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getReviewStats, getReviewsPage } from "@/lib/services/reviews";
import { REVIEWS_PER_PAGE, reviewPageCount } from "../lib/reviews";
import { ReviewPager } from "./review-pager";

/* Reviews block on the listing detail page. Async server component owning its
   own reads, so it streams below its own <Suspense> instead of blocking the
   listing content above it.

   The summary and the first page render as server HTML; the client pager
   fetches pages 2+ by row range. Count and average come from the
   owner_review_stats aggregate rather than from the fetched page — that page
   holds four rows, so deriving them here would be wrong for any host with
   more reviews than that. */
export async function Reviews({ ownerKey }: { ownerKey: string }) {
  const [t, { total, avg }, firstPage] = await Promise.all([
    getTranslations("detail.reviews"),
    getReviewStats(ownerKey),
    getReviewsPage(ownerKey, 1),
  ]);
  const pageCount = reviewPageCount(total);

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          {total > 0 && (
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <StarRow value={avg} size={15} />
              <span className="text-foreground font-medium tabular-nums">
                {avg.toFixed(1)}
              </span>
              · {t("count", { count: total })}
            </p>
          )}
        </div>
        <Link
          href={`/owner/${ownerKey}`}
          className="text-sm font-medium text-primary hover:underline focus-ring"
        >
          {t("seeHostProfile")} →
        </Link>
      </div>

      {total === 0 ? (
        <div className="bg-card p-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary text-muted-foreground mb-3">
            <Star size={22} />
          </div>
          <h3 className="font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            {t("emptyBody")}
          </p>
        </div>
      ) : (
        <ReviewPager
          ownerId={ownerKey}
          total={total}
          pageCount={pageCount}
          firstPage={
            <div className="grid sm:grid-cols-2 gap-4 stagger">
              {firstPage.map((r) => (
                <ReviewCard key={r.id} r={r} />
              ))}
            </div>
          }
        />
      )}
    </div>
  );
}

/* Heading + summary line above a full first page of cards — the footprint the
   loaded block occupies. */
export function ReviewsSkeleton() {
  return (
    <div className="mt-10" aria-busy="true">
      <div className="mb-4">
        <Skeleton className="skeleton h-6 w-28" />
        <Skeleton className="skeleton mt-2 h-4 w-48" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: REVIEWS_PER_PAGE }).map((_, i) => (
          <SkeletonReviewCard key={i} />
        ))}
      </div>
    </div>
  );
}
