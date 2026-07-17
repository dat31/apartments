"use client";

import { useTranslations } from "next-intl";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* Share a listing. On devices with the Web Share API (mobile — so Zalo,
   Messenger, WhatsApp, SMS… all appear in the native sheet) it opens that
   sheet; everywhere else it copies the link and confirms with a toast. The
   link is the plain, already-localized/canonical page URL, which unfurls with
   the listing photo and title via the OG pipeline. Kept generic (title + url)
   so tour cards can reuse it later. */
export function ShareButton({
  title,
  url,
  variant = "secondary",
  className,
}: {
  title: string;
  url?: string;
  variant?: "secondary" | "ghost";
  className?: string;
}) {
  const t = useTranslations("detail");

  async function handleShare() {
    const shareUrl = url ?? window.location.href;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: title, url: shareUrl });
        return;
      } catch (err) {
        // Dismissing the share sheet aborts the promise — that's a no-op, not
        // an error to surface. Any other failure falls through to clipboard.
        if ((err as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("linkCopied"));
    } catch {
      // Clipboard unavailable (e.g. an insecure context) — tell the user
      // rather than failing silently.
      toast.error(t("linkCopyFailed"));
    }
  }

  return (
    <Button
      variant={variant}
      size="sm"
      className={cn("gap-1.5", className)}
      onClick={handleShare}
    >
      <Share2 size={18} /> {t("share")}
    </Button>
  );
}
