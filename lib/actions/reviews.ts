"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ReviewInputSchema, type ReviewInput } from "@/schemas/review";
import { ownerUuidOf, reviewsTag } from "@/lib/services/reviews";

/* ============================================================
   Leave-a-review write path.

   Server Actions are public HTTP endpoints, so every rule the UI
   enforces is re-checked here: the payload is re-validated, the
   writer must be signed in, and nobody reviews themselves. RLS
   (`reviews_insert_author` / `reviews_update_author`) is the last
   line — it only accepts a row whose author_id is the caller.

   One review per renter per owner: the write is an upsert on
   (owner_id, author_id), which the `reviews_owner_author_uniq`
   index both enforces and resolves. Posting again edits what you
   already wrote instead of stacking a second row onto the
   owner's count and average.
   ============================================================ */

export type SubmitReviewResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "unauthenticated"
        | "invalid"
        | "not-found"
        | "own-profile"
        | "duplicate"
        | "failed";
    };

export async function submitReview(
  input: ReviewInput
): Promise<SubmitReviewResult> {
  const parsed = ReviewInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { ownerId, rating, text } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const uuid = ownerUuidOf(ownerId);
  if (!uuid) return { ok: false, error: "not-found" };

  // The button is hidden on your own profile; this is the backstop.
  if (uuid === user.id) return { ok: false, error: "own-profile" };

  // reviews.owner_id is FK-constrained to profiles, but a missing profile
  // should read as "no such owner" rather than a generic write failure.
  const { data: owner } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", uuid)
    .maybeSingle();
  if (!owner) return { ok: false, error: "not-found" };

  /* No listing_id in the payload, even though ReviewInputSchema carries one:
     on the conflict-update branch PostgREST only writes the columns it was
     given, so sending an explicit null would wipe a stored reference. Same
     reason created_at is absent — an edited review keeps its original date,
     which is the month the card shows. */
  const { error } = await supabase.from("reviews").upsert(
    {
      owner_id: uuid,
      author_id: user.id,
      rating,
      text,
    },
    { onConflict: "owner_id,author_id" }
  );
  if (error) {
    console.error("[reviews] upsert failed", error);
    // Unreachable while this is an upsert, but 23505 has one honest meaning.
    if (error.code === "23505") return { ok: false, error: "duplicate" };
    return { ok: false, error: "failed" };
  }

  updateTag(reviewsTag(uuid));
  return { ok: true };
}
