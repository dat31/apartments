import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { reviewRange } from "@/app/[lang]/(app)/apartments/[id]/lib/reviews";
import { REVIEW_SELECT, toReview, type ReviewRow } from "./reviews-map";
import { type Review, type ReviewInput } from "@/schemas/review";
import { ServiceError } from "./errors";
import { requireUser } from "./session";

/* ============================================================
   Reviews service — the read path for owner reviews.

   Reviews are `reviews` rows addressed by the reviewed owner's
   profile uuid. The table is anon-readable via RLS
   `reviews_select_public`, so the cookieless public client works
   inside a "use cache" boundary.

   Two reads, deliberately separate:

   • getReviewStats — count, average and the 1–5 breakdown, from
     the owner_review_stats RPC. One scan, three numbers; nothing
     here scales with the review count.
   • getReviewsPage — one page of cards. Bounded, because the
     pager is a client component and anything handed to it is
     serialized into the RSC payload.

   Deriving the stats from a fetched page would be wrong the
   moment an owner has more reviews than fit on one, which is why
   they come from the database instead.
   ============================================================ */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cache tag covering both reads, so one posted review expires them together
    and the numbers can never disagree with the cards. */
export const reviewsTag = (ownerId: string) => `reviews:${ownerId}`;

/** The id rows are stored against, or null when it isn't a uuid at all. */
export const ownerUuidOf = (id: string): string | null =>
  UUID_RE.test(id) ? id : null;

export type ReviewStats = {
  total: number;
  avg: number;
  /** Review count per star rating, keyed 1–5. */
  dist: Record<number, number>;
};

const EMPTY_STATS: ReviewStats = {
  total: 0,
  avg: 0,
  dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

/** Count, average and star breakdown for an owner. */
export async function getReviewStats(id: string): Promise<ReviewStats> {
  "use cache";
  cacheLife("hours");
  cacheTag(reviewsTag(id));

  const ownerId = ownerUuidOf(id);
  if (!ownerId) return EMPTY_STATS;

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("owner_review_stats", {
    owner: ownerId,
  });

  if (error) throw new Error(`Failed to load review stats: ${error.message}`);

  // A set-returning function comes back as a one-row array.
  const row = data?.[0];
  if (!row) return EMPTY_STATS;

  const dist = (row.dist ?? {}) as Record<string, number>;
  return {
    total: Number(row.total),
    avg: Number(row.avg),
    dist: Object.fromEntries(
      [1, 2, 3, 4, 5].map((s) => [s, Number(dist[String(s)] ?? 0)])
    ),
  };
}

/** One page of an owner's reviews, newest first. `created_at` alone isn't a
    total order — reviews written in the same transaction tie — so `id` breaks
    ties and keeps rows from repeating or vanishing between pages. */
export async function getReviewsPage(
  id: string,
  page: number = 1
): Promise<Review[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(reviewsTag(id));

  const ownerId = ownerUuidOf(id);
  if (!ownerId) return [];

  const [from, to] = reviewRange(page);
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);
  return (data ?? []).map((row) => toReview(row as ReviewRow, ownerId));
}

/* ============================================================
   The reviewer's own row — read and write.

   Cookie-bound and uncached, unlike everything above: the cached
   reads run on the anon client and know nothing about who is
   looking, which is exactly why "have I already reviewed this
   host?" can't come from them.
   ============================================================ */

export type MyReview = { id: string; rating: number; text: string };

/** The caller's own review of an owner, if they have written one. */
export async function getMyReview(ownerId: string): Promise<MyReview | null> {
  const user = await requireUser();

  const uuid = ownerUuidOf(ownerId);
  if (!uuid) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, text")
    .eq("owner_id", uuid)
    .eq("author_id", user.id)
    .maybeSingle();

  if (error) throw new ServiceError("failed", error.message);
  return data ?? null;
}

/**
 * Write the caller's review of an owner, and return the owner id so the action
 * can expire that owner's cached reads.
 *
 * One review per renter per owner: the write is an upsert on
 * (owner_id, author_id), which the `reviews_owner_author_uniq` index both
 * enforces and resolves. Posting again edits what you already wrote instead of
 * stacking a second row onto the owner's count and average.
 *
 * RLS (`reviews_insert_author` / `reviews_update_author`) is the last line — it
 * only accepts a row whose author_id is the caller.
 */
export async function submitReview(
  input: Pick<ReviewInput, "ownerId" | "rating" | "text">
): Promise<string> {
  const user = await requireUser();

  const uuid = ownerUuidOf(input.ownerId);
  if (!uuid) throw new ServiceError("not-found");

  // The button is hidden on your own profile; this is the backstop.
  if (uuid === user.id) throw new ServiceError("own-profile");

  const supabase = await createClient();

  // reviews.owner_id is FK-constrained to profiles, but a missing profile
  // should read as "no such owner" rather than a generic write failure.
  const { data: owner } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", uuid)
    .maybeSingle();
  if (!owner) throw new ServiceError("not-found");

  /* No listing_id, even though ReviewInput carries one: on the
     conflict-update branch PostgREST only writes the columns it was given, so
     sending an explicit null would wipe a stored reference. Same reason
     created_at is absent — an edited review keeps its original date, which is
     the month the card shows. */
  const { error } = await supabase.from("reviews").upsert(
    {
      owner_id: uuid,
      author_id: user.id,
      rating: input.rating,
      text: input.text,
    },
    { onConflict: "owner_id,author_id" }
  );

  if (error) {
    console.error("[reviews] upsert failed", error);
    // Unreachable while this is an upsert, but 23505 has one honest meaning.
    if (error.code === "23505") throw new ServiceError("conflict");
    throw new ServiceError("failed", error.message);
  }
  return uuid;
}
