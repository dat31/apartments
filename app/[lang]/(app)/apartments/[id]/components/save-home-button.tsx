"use client";

import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSaved } from "@/hooks/use-saved";
import posthog from "posthog-js";

/* Self-contained save toggle for the booking card — owns the shortlist hook
   so the booking aside / mobile bar can stay server-rendered. */
export function SaveHomeButton({
  id,
  mode,
}: {
  id: string;
  mode: "full" | "icon";
}) {
  const t = useTranslations("detail");
  const { isSaved, toggleSave } = useSaved();
  const saved = isSaved(id);

  const handleToggle = () => {
    toggleSave(id);
    posthog.capture("listing_saved", { listing_id: id, saved: !saved });
  };

  if (mode === "icon") {
    return (
      <Button
        variant={saved ? "default" : "secondary"}
        size="icon"
        className="size-11"
        aria-label={saved ? t("saved") : t("save")}
        onClick={handleToggle}
      >
        <Heart size={20} />
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="lg"
      className="h-12 gap-2"
      onClick={handleToggle}
    >
      <Heart size={18} /> {saved ? t("saved") : t("save")}
    </Button>
  );
}
