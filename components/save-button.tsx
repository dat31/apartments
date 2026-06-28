"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useSaved } from "@/hooks/use-saved";
import { Button } from "./ui/button";

/* Self-contained save toggle — the only interactive island on a ListingCard.
   Reads/writes the shortlist itself so the card can stay a server component. */
export function SaveButton({ id }: { id: string }) {
  const t = useTranslations("apartments.card");
  const { isSaved, toggleSave } = useSaved();
  const saved = isSaved(id);
  return (
    <Button
      size="icon"
      onClick={(e) => {
        // Sits above the card's stretched link — keep the click local.
        e.preventDefault();
        e.stopPropagation();
        toggleSave(id);
      }}
      className={cn(
        "absolute top-3 right-3 z-20 w-9 h-9 inline-flex items-center justify-center transition-colors focus-ring",
        saved
          ? "bg-primary text-primary-foreground"
          : "bg-background text-foreground hover:bg-secondary"
      )}
      aria-label={saved ? t("removeSaved") : t("save")}
    >
      <Heart size={18} />
    </Button>
  );
}
