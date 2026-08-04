"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { setListingStatusAction } from "@/lib/actions/listings";
import { type Listing } from "@/schemas/listing";

/* Whether a listing is live — the one action on a dashboard row that changes
   what the rest of the world sees, so it stays out in the open rather than
   behind the row menu.

   Self-contained on purpose: it takes an id and a status and calls the action
   itself, so the row around it and the list around that stay Server
   Components. Nothing threads an onToggleStatus down.

   The optimistic flip replaces what react-query's onMutate/onError block used
   to do, and gets the rollback for free: useOptimistic holds `next` only for
   the life of the transition. On success the transition stays open until
   router.refresh() has delivered the real row — so the label never flickers
   back through its old value. On failure we return early, the transition
   closes, and the button snaps back to `status` under the toast. */
export function ListingStatusToggle({
  listingId,
  status,
}: {
  listingId: string;
  status: Listing["status"];
}) {
  const t = useTranslations("dashboard.listings");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const isActive = optimisticStatus === "active";

  const flip = () => {
    const next = isActive ? "draft" : "active";
    startTransition(async () => {
      setOptimisticStatus(next);
      posthog.capture("listing_status_toggled", {
        listing_id: listingId,
        new_status: next,
      });

      const result = await setListingStatusAction(listingId, next);
      if (!result.ok) {
        toast.error(t("statusFailed"));
        return;
      }
      router.refresh();
    });
  };

  return (
    <Button variant="ghost" size="sm" className="shrink-0" onClick={flip}>
      {isActive ? t("pause") : t("publish")}
    </Button>
  );
}
