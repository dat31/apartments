"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useUser } from "@/hooks/auth";
import { useHydrated } from "@/hooks/use-hydrated";
import { ensureListingChannel } from "@/lib/actions/listing-chat";

/* "Message owner" on a listing detail page. Signed-out visitors are sent to
   sign-in and returned here; the owner of the listing never sees it (the
   server action refuses that case too). */
export function MessageOwnerButton({
  listingId,
  className,
}: {
  listingId: string;
  className?: string;
}) {
  const t = useTranslations("messaging");
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useUser();
  // Auth is client-only state; without this the server render and the first
  // client render disagree about whether the button is enabled.
  const hydrated = useHydrated();
  const [pending, setPending] = React.useState(false);

  const open = () => {
    if (!user) {
      router.push(`/signin?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setPending(true);
    void ensureListingChannel(listingId)
      .then((result) => {
        if (result.ok) {
          router.push(`/messages?channel=${result.channelId}`);
          return;
        }
        setPending(false);
        toast.error(
          result.error === "own-listing" ? t("ownListing") : t("startFailed")
        );
      })
      .catch(() => {
        setPending(false);
        toast.error(t("startFailed"));
      });
  };

  return (
    <Button
      variant="secondary"
      size="lg"
      className={className ?? "h-12 gap-2"}
      onClick={open}
      disabled={!hydrated || pending}
    >
      <MessageSquare size={18} /> {t("messageOwner")}
    </Button>
  );
}
