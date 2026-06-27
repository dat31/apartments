import { Link } from "@/lib/i18n/link";
import { Star } from "lucide-react";
import { ReviewCard } from "@/components/review-card";
import { StarRow } from "@/components/star-row";
import { avgOf } from "@/lib/data/listings";
import { type Review } from "@/schemas/review";
import { type Owner } from "@/schemas/owner";
import { reviewPageCount, reviewsForPage } from "../lib/reviews";
import { ReviewPager } from "./review-pager";

/* Reviews block. The summary and the first page of reviews render on the
   server (static HTML); the client pager takes over for any further pages. */
export function Reviews({
  reviews,
  owner,
  ownerKey,
}: {
  reviews: Review[];
  owner: Owner | null;
  ownerKey: string;
}) {
  const avg = avgOf(reviews);
  const pageCount = reviewPageCount(reviews);

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Reviews</h2>
          {reviews.length > 0 && (
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <StarRow value={avg} size={15} />
              <span className="text-foreground font-medium tabular-nums">
                {avg.toFixed(1)}
              </span>
              · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {owner && (
          <Link
            href={`/owner/${ownerKey}`}
            className="text-sm font-medium text-primary hover:underline focus-ring"
          >
            See host profile →
          </Link>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="bg-card p-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary text-muted-foreground mb-3">
            <Star size={22} />
          </div>
          <h3 className="font-semibold">No reviews yet</h3>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            This home&apos;s host hasn&apos;t been reviewed yet.
          </p>
        </div>
      ) : (
        <ReviewPager
          reviews={reviews}
          pageCount={pageCount}
          firstPage={
            <div className="grid sm:grid-cols-2 gap-4 stagger">
              {reviewsForPage(reviews, 1).map((r) => (
                <ReviewCard key={r.id} r={r} />
              ))}
            </div>
          }
        />
      )}
    </div>
  );
}
