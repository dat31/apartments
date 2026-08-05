import { type NotificationItem } from "@/schemas/notification";

/* Where a notification takes you when you click it.

   Pure, and separate from the row that renders it, because the answer is not
   obvious for most kinds: a tour notification points at whichever tour surface
   belongs to the *recipient's* side, and a review points at the recipient's
   own profile rather than at the person who wrote it.

   That is why it takes the viewer's id: the row describes something that
   happened to them, so "you" is the missing half of the answer and the
   notification does not carry it (every row in the feed has the same
   recipient — the caller).

   Every href here is unprefixed; `@/i18n/navigation`'s Link adds the locale. */
export function notificationHref(
  n: NotificationItem,
  viewerId: string | undefined
): string {
  switch (n.kind) {
    case "tour_requested":
    case "tour_confirmed":
    case "tour_reschedule_proposed":
    case "tour_reschedule_accepted":
    case "tour_declined":
      /* The renter's tours live at /tour and the owner's on a dashboard tab;
         which one the reader wants depends on the side they are on, not on the
         kind. `tour_declined` is the case that proves it — either party may
         decline, so either party may receive it. */
      return n.tourRole === "owner" ? "/owner/dashboard/tours" : "/tour";

    case "review_received":
      /* The owner's *own* public profile, which is where their reviews are
         shown. Linking at the actor would send them to the reviewer's page. */
      return viewerId ? `/owner/${viewerId}` : "/owner/dashboard";

    case "saved_search_match":
      /* Straight to the home. A listing unpublished since the match comes back
         null (RLS hides it), leaving nothing to open — browse is the honest
         second choice. */
      return n.listingId ? `/apartments/${n.listingId}` : "/apartments";
  }
}
