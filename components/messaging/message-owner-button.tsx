"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { useUser } from "@/hooks/auth";
import { ensureListingChannel } from "@/lib/actions/listing-chat";

/* "Message owner" on a listing detail page.

   Provisions the (listing, renter) conversation server-side and hands off to
   the inbox with that thread selected — the design's flow, where the listing
   page starts a conversation but the conversation itself lives in one place.

   Signed-out visitors are sent to sign-in with a return path, matching how
   the book-tour flow gates. */

export function MessageOwnerButton({
  listingId,
  className,
}: {
  listingId: string;
  className?: string;
}) {
  const t = useTranslations("messaging");
  const router = useRouter();
  const { data: user, isPending } = useUser();
  const [pending, startTransition] = React.useTransition();

  const open = () => {
    if (!user) {
      router.push(`/signin?next=/apartments/${listingId}`);
      return;
    }
    startTransition(async () => {
      const result = await ensureListingChannel(listingId);
      if (result.ok) {
        router.push(`/messages?c=${result.channelId}`);
      } else {
        toast.error(t("startFailed"));
      }
    });
  };

  return (
    <Button
      variant="secondary"
      className={className}
      onClick={open}
      disabled={pending || isPending}
    >
      <MessageCircle size={17} />
      {t("messageOwner")}
    </Button>
  );
}
