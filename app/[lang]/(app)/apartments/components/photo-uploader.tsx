"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { PhotoCard } from "./photo-card";
import { useUser } from "@/hooks/auth";
import { uploadListingPhoto } from "@/lib/supabase/storage";
import { ImageIcon, Loader2, Plus } from "lucide-react";

/* Photo grid with drag-to-reorder (react-dnd) + file upload.
   Files are uploaded to the public listing-photos Storage bucket as they're
   picked, and the listing stores their public URLs — not data URLs, which
   would bypass next/image optimization and bloat rows and page payloads.
   The first photo is the cover. */
export function PhotoUploader({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useTranslations("listingForm.photoUploader");
  const { data: user } = useUser();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const addFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!files.length || uploading || !user) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        files.map((file) => uploadListingPhoto(file, user.id))
      );
      onChange([...value, ...urls]);
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (i: number) =>
    onChange(value.filter((_, idx) => idx !== i));

  const moveImage = (from: number, to: number) => {
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const openPicker = () => fileRef.current?.click();

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {value.length > 0 ? (
        <DndProvider backend={HTML5Backend}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {value.map((src, i) => (
              <PhotoCard
                key={src.slice(0, 32) + i}
                src={src}
                index={i}
                move={moveImage}
                onRemove={removeImage}
              />
            ))}
            <button
              type="button"
              onClick={openPicker}
              disabled={uploading}
              className="aspect-[4/3] flex flex-col items-center justify-center gap-1.5 text-muted-foreground bg-muted hover:bg-accent hover:text-accent-foreground transition-colors focus-ring disabled:pointer-events-none disabled:opacity-70"
            >
              {uploading ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <Plus size={22} />
              )}
              <span className="text-sm font-medium">
                {uploading ? t("uploading") : t("addPhoto")}
              </span>
            </button>
          </div>
        </DndProvider>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground bg-muted hover:bg-accent hover:text-accent-foreground transition-colors focus-ring disabled:pointer-events-none disabled:opacity-70"
        >
          {uploading ? (
            <Loader2 size={30} className="animate-spin" />
          ) : (
            <ImageIcon size={30} />
          )}
          <span className="text-sm font-medium text-foreground">
            {uploading ? t("uploading") : t("uploadPhotos")}
          </span>
          <span className="text-xs">{t("uploadHint")}</span>
        </button>
      )}
    </div>
  );
}
