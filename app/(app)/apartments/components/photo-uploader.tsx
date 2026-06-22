"use client";

import * as React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { PhotoCard } from "./photo-card";
import { ImageIcon, Plus } from "lucide-react";

/* Photo grid with drag-to-reorder (react-dnd) + file upload.
   Uploaded files are read into data URLs so they can be stored on the
   listing and rendered immediately. The first photo is the cover. */
export function PhotoUploader({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!files.length) return;
    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    ).then((urls) => onChange([...value, ...urls]));
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
              className="aspect-[4/3] flex flex-col items-center justify-center gap-1.5 text-muted-foreground bg-muted hover:bg-accent hover:text-accent-foreground transition-colors focus-ring"
            >
              <Plus size={22} />
              <span className="text-sm font-medium">Add photo</span>
            </button>
          </div>
        </DndProvider>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          className="w-full flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground bg-muted hover:bg-accent hover:text-accent-foreground transition-colors focus-ring"
        >
          <ImageIcon size={30} />
          <span className="text-sm font-medium text-foreground">
            Upload photos
          </span>
          <span className="text-xs">PNG or JPG — add as many as you like</span>
        </button>
      )}
    </div>
  );
}
