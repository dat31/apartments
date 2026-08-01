"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/auth";
import { PanoramaRejected, uploadPanorama } from "@/lib/supabase/storage";
import type { SceneDraft } from "@/hooks/use-virtual-tour";

/* Adding a room: pick one or more 360 photos, and each becomes a scene.

   The empty state teaches rather than instructs. A host who has never shot an
   equirectangular photo is the common case, so the copy says what one is and
   where to get it — and a rejection names the rule that was broken
   ("this looks like an ordinary photo") instead of failing silently, which is
   the difference between a tool a host finishes and one they abandon. */
export function RoomUploader({
  onAdd,
  disabled,
  empty,
}: {
  onAdd: (draft: SceneDraft) => Promise<unknown>;
  disabled?: boolean;
  empty: boolean;
}) {
  const t = useTranslations("virtualTourEditor");
  const { data: user } = useUser();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const addFiles = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length || busy || !user) return;
    setBusy(true);
    try {
      for (const file of files) {
        try {
          const uploaded = await uploadPanorama(file, user.id);
          await onAdd({
            // The filename is a better first guess than "Room 1", and the
            // owner renames it in place anyway.
            name: defaultRoomName(file.name),
            room: "other",
            panoramaUrl: uploaded.panoramaUrl,
            previewUrl: uploaded.previewUrl,
          });
        } catch (err) {
          toast.error(
            err instanceof PanoramaRejected
              ? t(`rejected.${err.reason}`, { file: file.name })
              : t("uploadFailed", { file: file.name })
          );
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const open = () => fileRef.current?.click();
  const blocked = busy || disabled || !user;

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={open}
        disabled={blocked}
        className="focus-ring flex w-full flex-col items-center justify-center gap-2 bg-muted py-10 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-70"
      >
        {busy ? (
          <Loader2 size={28} className="animate-spin" />
        ) : (
          <Camera size={28} />
        )}
        <span className="text-sm font-medium text-foreground">
          {busy ? t("uploading") : empty ? t("addFirstRoom") : t("addRoom")}
        </span>
        <span className="max-w-100 px-4 text-center text-xs text-pretty">
          {t("uploadHint")}
        </span>
      </button>

      {empty && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground text-pretty">
          {t("captureHelp")}
        </p>
      )}
    </div>
  );
}

/** "living-room-2.jpg" → "Living room 2". A filename is usually close enough
    to be worth offering; the owner edits it in place. */
function defaultRoomName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  if (!base) return "Room";
  return base.charAt(0).toUpperCase() + base.slice(1, 80);
}
