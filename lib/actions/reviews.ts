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
   (`reviews_insert_author`) is the last line — it only accepts a
   row whose author_id is the caller.
   ============================================================ */

export type CreateReviewResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "unauthenticated"
        | "invalid"
        | "not-found"
        | "own-profile"
        | "failed";
    };

export async function createReview(
  input: ReviewInput
): Promise<CreateReviewResult> {
  const parsed = ReviewInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { ownerId, rating, text, listingId } = parsed.data;

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

  const { error } = await supabase.from("reviews").insert({
    owner_id: uuid,
    author_id: user.id,
    listing_id: listingId ?? null,
    rating,
    text,
  });
  if (error) {
    console.error("[reviews] insert failed", error);
    return { ok: false, error: "failed" };
  }

  updateTag(reviewsTag(uuid));
  return { ok: true };
}
