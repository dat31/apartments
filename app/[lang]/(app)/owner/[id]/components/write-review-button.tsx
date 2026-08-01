"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname } from "@/i18n/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/auth";
import { useProfile } from "@/hooks/use-profile";
import { useHydrated } from "@/hooks/use-hydrated";
import { useMyReview, myReviewKeys } from "@/hooks/use-my-review";
import { submitReviewAction } from "@/lib/actions/reviews";
import { type ReviewFormValues } from "@/schemas/review";
import { ReviewModal } from "./review-modal";

/* Whether the viewer is the owner whose page this is. Client-only: auth state
   isn't known during the server render, and `hydrated` keeps the first client
   render agreeing with the server's. */
function useIsSelf(ownerUuid: string | null) {
  const { data: user } = useUser();
  const hydrated = useHydrated();
  const isSelf = !!user && !!ownerUuid && user.id === ownerUuid;
  return { hydrated, isSelf };
}

/* The empty-state sentence. Its own island because the owner shouldn't be
   invited to be "the first to review" themselves. */
export function ReviewsEmptyBody({
  ownerUuid,
  firstName,
}: {
  ownerUuid: string | null;
  firstName: string;
}) {
  const t = useTranslations("owner");
  const { isSelf } = useIsSelf(ownerUuid);

  return (
    <p className="mt-1 text-muted-foreground text-pretty max-w-sm mx-auto">
      {isSelf ? t("reviewsEmptySelf") : t("reviewsEmptyBody", { name: firstName })}
    </p>
  );
}

/* The "Write a review" affordance and its dialog, as one self-contained
   client island so the reviews section around it stays a server component.

   Renders nothing until hydration resolves who's looking: signed-out
   visitors get sent to sign-in, and the owner never sees it on their own
   profile (submitReview refuses that case server-side too). Withholding it
   until then beats showing a button that vanishes a beat later.

   For the same reason it also waits on the viewer's own review: a renter has
   one review per owner, so the button either writes their first or edits the
   one they have, and the label shouldn't flip once the answer arrives. */
export function WriteReviewButton({
  ownerKey,
  ownerUuid,
  firstName,
  className,
}: {
  ownerKey: string;
  /* The `profiles` uuid behind this page, or null for an unresolvable id.
     Compared against the signed-in user to detect "this is my own profile". */
  ownerUuid: string | null;
  firstName: string;
  className?: string;
}) {
  const t = useTranslations("owner");
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: user, isPending: userPending } = useUser();
  const { profile } = useProfile();
  const { hydrated, isSelf } = useIsSelf(ownerUuid);
  const { data: myReview, isPending: myReviewPending } = useMyReview(ownerUuid);
  const [open, setOpen] = React.useState(false);

  /* A signed-out visitor has no review to look up, and their query stays
     `pending` forever because it's disabled — so only wait on it once we know
     someone is signed in, or the button would never appear for guests. */
  const waiting = userPending || (!!user && !!ownerUuid && myReviewPending);
  if (!hydrated || waiting || isSelf) return null;

  const isEdit = !!myReview;

  /* Signed-out visitors go to sign-in and come back here, rather than writing
     a whole review only to be bounced on submit. */
  const openReview = () => {
    if (!user) {
      router.push(`/signin?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setOpen(true);
  };

  const submit = async (data: ReviewFormValues): Promise<boolean> => {
    if (!user) return false;

    const result = await submitReviewAction({
      ownerId: ownerKey,
      rating: data.rating,
      text: data.text,
    }).catch(() => ({ ok: false, error: "failed" }) as const);

    if (!result.ok) {
      toast.error(
        result.error === "own-profile" ? t("reviewOwnProfile") : t("reviewFailed")
      );
      return false;
    }

    /* The action expired this owner's cached reviews, so a refresh re-renders
       the server region with the new one in place — keeping the count, the
       average and the rating breakdown consistent with the cards, which an
       optimistic client-side insert could not.

       The two client-side reads have to be dropped by hand: this hook's own
       row (which decides write-vs-edit next time) and the pager's pages 2+,
       where an edited body would otherwise linger. */
    router.refresh();
    queryClient.invalidateQueries({ queryKey: myReviewKeys.all });
    if (ownerUuid) {
      queryClient.invalidateQueries({ queryKey: ["reviews", ownerUuid] });
    }

    toast.success(isEdit ? t("reviewUpdated") : t("reviewPosted"), {
      description: isEdit
        ? t("reviewUpdatedDesc", { name: firstName })
        : t("reviewPostedDesc", { name: firstName }),
    });
    return true;
  };

  return (
    <>
      <Button className={className ?? "h-11 gap-1.5"} onClick={openReview}>
        <Star size={17} /> {isEdit ? t("editReview") : t("writeReview")}
      </Button>
      <ReviewModal
        open={open}
        onClose={() => setOpen(false)}
        firstName={firstName}
        authorName={profile.name || t("reviewAuthorFallback")}
        initial={myReview ?? undefined}
        isEdit={isEdit}
        onSubmit={submit}
      />
    </>
  );
}
