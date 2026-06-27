"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSaved } from "@/hooks/use-saved";

/* Self-contained save toggle for the booking card — owns the shortlist hook
   so the booking aside / mobile bar can stay server-rendered. */
export function SaveHomeButton({
  id,
  mode,
}: {
  id: string;
  mode: "full" | "icon";
}) {
  const { isSaved, toggleSave } = useSaved();
  const saved = isSaved(id);

  if (mode === "icon") {
    return (
      <Button
        variant={saved ? "default" : "secondary"}
        size="icon"
        className="size-11"
        aria-label={saved ? "Saved" : "Save home"}
        onClick={() => toggleSave(id)}
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
      onClick={() => toggleSave(id)}
    >
      <Heart size={18} /> {saved ? "Saved" : "Save home"}
    </Button>
  );
}
