"use server";

import { updateTag } from "next/cache";
import { ReviewInputSchema, type Review, type ReviewInput } from "@/schemas/review";
import {
  getMyReview,
  getReviewsPage,
  reviewsTag,
  submitReview,
  type MyReview,
} from "@/lib/services/reviews";
import { toResult, type ActionResult } from "./result";

/* ============================================================
   Review entry points.

   Server Actions are public HTTP endpoints, so every rule the UI
   enforces is re-checked below the line: the payload is
   re-validated here, and the service requires a session, refuses
   a self-review, and writes only a row whose author is the
   caller.
   ============================================================ */

/** The caller's own review of an owner, if they have written one. */
export async function fetchMyReview(
  ownerId: string
): Promise<ActionResult<MyReview | null>> {
  return toResult(() => getMyReview(ownerId));
}

/** One page of an owner's reviews. Public — reads through the cached path. */
export async function fetchReviewsPage(
  ownerId: string,
  page: number
): Promise<ActionResult<Review[]>> {
  return toResult(() => getReviewsPage(ownerId, page));
}

export type SubmitReviewResult = ActionResult;

export async function submitReviewAction(
  input: ReviewInput
): Promise<SubmitReviewResult> {
  const parsed = ReviewInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const result = await toResult(() => submitReview(parsed.data));
  if (!result.ok) return result;

  // Count, average and cards share one tag, so they can never disagree.
  updateTag(reviewsTag(result.data));
  return { ok: true, data: undefined };
}
