import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRow } from "@/components/star-row";
import { avgOf } from "@/lib/data/listings";
import { getReviewsForOwner } from "@/lib/services/reviews";

/* The rating box in the hero — average, stars, review count.

   Split out of <OwnerInfo> so the hero's identity half (name, badges, bio,
   stats) renders as soon as the owner resolves instead of waiting on the
   reviews query. Fetches its own reviews; the read is "use cache"d and shared
   with <OwnerReviews>, so the extra boundary costs no extra query. */
export async function OwnerRatingSummary({ id }: { id: string }) {
  const [t, reviews] = await Promise.all([
    getTranslations("detail.reviews"),
    getReviewsForOwner(id),
  ]);
  const avg = avgOf(reviews);

  return (
    <div className="sm:w-44 shrink-0 bg-secondary text-secondary-foreground p-5 flex sm:flex-col items-center sm:text-center gap-4 sm:gap-1.5">
      <div className="text-5xl font-semibold tracking-tight tabular-nums leading-none">
        {reviews.length ? avg.toFixed(1) : "—"}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <StarRow value={avg} size={17} />
        <p className="text-sm text-muted-foreground">
          {t("count", { count: reviews.length })}
        </p>
      </div>
    </div>
  );
}

/* Same box, same padding — only the three text rows are placeholders, so the
   hero's third column holds its width while the count streams in. */
export function OwnerRatingSummarySkeleton() {
  return (
    <div
      className="sm:w-44 shrink-0 bg-secondary text-secondary-foreground p-5 flex sm:flex-col items-center sm:text-center gap-4 sm:gap-1.5"
      aria-busy="true"
    >
      <Skeleton className="skeleton h-12 w-16" />
      <div className="flex flex-col items-center gap-1.5">
        <Skeleton className="skeleton h-4 w-24" />
        <Skeleton className="skeleton h-4 w-20" />
      </div>
    </div>
  );
}
