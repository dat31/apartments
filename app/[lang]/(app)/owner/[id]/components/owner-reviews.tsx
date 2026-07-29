import { getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewCard } from "@/components/review-card";
import { StarRow } from "@/components/star-row";
import { SkeletonReviewCard } from "@/components/skeleton-review-card";
import {
  REVIEWS_PER_PAGE,
  reviewPageCount,
} from "@/app/[lang]/(app)/apartments/[id]/lib/reviews";
import { ReviewPager } from "@/app/[lang]/(app)/apartments/[id]/components/review-pager";
import { getOwnerProfile } from "@/lib/services/owners";
import {
  getReviewStats,
  getReviewsPage,
  ownerUuidOf,
} from "@/lib/services/reviews";
import { ReviewsEmptyBody, WriteReviewButton } from "./write-review-button";

/* Reviews written about this owner. Async server component owning its own
   read, so it streams below its own <Suspense> rather than waiting on the
   listings query in <OwnerHomes>.

   The summary, the rating breakdown and the first page of cards are server
   HTML; <ReviewPager> takes over on the client for pages 2+, fetching them by
   row range, and <WriteReviewButton> is the only other client island.

   Count, average and breakdown come from the owner_review_stats aggregate,
   not from the fetched page — the page holds four rows, so deriving them here
   would be wrong for any owner with more reviews than that. Both reads share
   one cache tag, so a posted review expires them together and the numbers can
   never disagree with the cards. */
export async function OwnerReviews({ id }: { id: string }) {
  const [t, tr, owner, stats, firstPageReviews] = await Promise.all([
    getTranslations("owner"),
    getTranslations("detail.reviews"),
    getOwnerProfile(id),
    getReviewStats(id),
    getReviewsPage(id, 1),
  ]);
  if (!owner) return null;

  const firstName = owner.name.split(" ")[0];
  const { total, avg } = stats;
  const pageCount = reviewPageCount(total);

  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: stats.dist[s] ?? 0 }));
  const maxN = Math.max(1, ...dist.map((d) => d.n));

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{tr("title")}</h2>
          <p className="mt-1 flex items-center gap-2 text-muted-foreground">
            <StarRow value={avg} size={16} />
            <span className="text-foreground font-medium tabular-nums">
              {total ? avg.toFixed(1) : "—"}
            </span>
            · {tr("count", { count: total })}
          </p>
        </div>
        <WriteReviewButton
          ownerKey={owner.key}
          ownerUuid={ownerUuidOf(id)}
          firstName={firstName}
        />
      </div>

      {total === 0 ? (
        <div className="bg-card p-14 text-center anim-fade">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
            <Star size={26} />
          </div>
          <h3 className="text-lg font-semibold">{tr("emptyTitle")}</h3>
          <ReviewsEmptyBody ownerUuid={ownerUuidOf(id)} firstName={firstName} />
          <WriteReviewButton
            ownerKey={owner.key}
            ownerUuid={ownerUuidOf(id)}
            firstName={firstName}
            className="mt-5 h-11 gap-1.5"
          />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          <div className="bg-card p-5 self-start lg:sticky lg:top-24">
            <p className="text-sm font-medium mb-3">{t("ratingBreakdown")}</p>
            <div className="flex flex-col gap-2">
              {dist.map(({ s, n }) => (
                <div key={s} className="flex items-center gap-2.5 text-sm">
                  <span className="flex items-center gap-1 w-9 text-muted-foreground tabular-nums">
                    {s} <Star fill="currentColor" size={12} className="text-primary" />
                  </span>
                  <span className="flex-1 h-2 bg-muted overflow-hidden">
                    <span
                      className="block h-full bg-primary"
                      style={{ width: `${(n / maxN) * 100}%` }}
                    />
                  </span>
                  <span className="w-5 text-right text-muted-foreground tabular-nums">
                    {n}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <ReviewPager
              ownerId={ownerUuidOf(id) ?? id}
              total={total}
              pageCount={pageCount}
              firstPage={
                <div className="grid sm:grid-cols-2 gap-4 stagger">
                  {firstPageReviews.map((r) => (
                    <ReviewCard key={r.id} r={r} />
                  ))}
                </div>
              }
            />
          </div>
        </div>
      )}
    </section>
  );
}

/* Heading + summary line, the breakdown sidebar and a full first page of
   cards — the same two-column footprint the loaded section occupies. */
export function OwnerReviewsSkeleton() {
  return (
    <section className="mt-10" aria-busy="true">
      <div className="mb-5">
        <Skeleton className="skeleton h-8 w-40" />
        <Skeleton className="skeleton mt-2 h-5 w-56" />
      </div>
      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        <div className="bg-card p-5 self-start">
          <Skeleton className="skeleton h-4 w-32 mb-3" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="skeleton h-4 w-full" />
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: REVIEWS_PER_PAGE }).map((_, i) => (
            <SkeletonReviewCard key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
