"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Grid2x2, Image as ImageIcon } from "lucide-react";

/* Lazy boundary for the lightbox: embla-carousel only ships once a photo is
   clicked, keeping it out of the detail page's initial bundle. No loading
   fallback — the overlay simply appears when the chunk lands. */
const Lightbox = dynamic(() => import("./lightbox").then((m) => m.Lightbox), {
  ssr: false,
});

/* Photo gallery: editorial mosaic on desktop, single hero on mobile, both
   opening a fullscreen lightbox carousel with a synced thumbnail rail.
   Renders real photos when `images` are present, falling back to the
   cover-color blocks otherwise. */
export function Gallery({
  images,
  colors,
  label,
}: {
  images?: string[];
  colors: string[];
  label: string;
}) {
  const t = useTranslations("detail.gallery");
  const shots = images?.length ? images : colors;
  const hasPhotos = Boolean(images?.length);
  const n = shots.length;
  const [open, setOpen] = React.useState(false);
  const [start, setStart] = React.useState(0);

  const openAt = (i: number) => {
    setStart(i);
    setOpen(true);
  };

  const fill = (i: number, sizes: string) =>
    hasPhotos ? (
      <Image
        src={shots[i]}
        alt={label}
        fill
        sizes={sizes}
        className="object-cover"
      />
    ) : (
      <span className="absolute inset-0" style={{ background: shots[i] }} />
    );

  /* A single preview tile — every tile keeps its own 16:9 frame.
     `more` overlays a "+N" veil on the last visible tile. */
  const tile = (i: number, sizes: string, more = 0) => (
    <button
      key={i}
      onClick={() => openAt(i)}
      className="group relative w-full overflow-hidden bg-secondary focus-ring aspect-[16/9]"
    >
      {fill(i, sizes)}
      <span className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
      {more > 0 && (
        <span className="absolute inset-0 flex items-center justify-center bg-foreground/55 text-background text-xl font-semibold">
          +{more}
        </span>
      )}
    </button>
  );

  return (
    <>
      {/* Desktop: 16:9 mosaic — cover + stacked companions, each a true 16:9 tile */}
      <div className="relative hidden sm:block">
        {n === 1 ? (
          tile(0, "100vw")
        ) : n === 2 ? (
          <div className="grid grid-cols-2 gap-2">
            {tile(0, "50vw")}
            {tile(1, "50vw")}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 items-start">
            <div className="col-span-2">{tile(0, "(min-width: 640px) 66vw, 100vw")}</div>
            <div className="flex flex-col gap-2">
              {tile(1, "33vw")}
              {tile(2, "33vw", n > 3 ? n - 3 : 0)}
            </div>
          </div>
        )}
        {n > 1 && (
          <div className="absolute bottom-3 right-3">
            <Button variant="secondary" size="sm" className="gap-2" onClick={() => openAt(0)}>
              <Grid2x2 size={16} /> {t("showAll", { count: n })}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile: single hero + counter */}
      <button
        onClick={() => openAt(0)}
        className="sm:hidden relative block w-full aspect-[16/9] overflow-hidden bg-secondary focus-ring"
      >
        {fill(0, "100vw")}
        {n > 1 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-foreground/70 text-background text-xs font-medium px-2.5 py-1.5">
            <ImageIcon size={14} /> 1 / {n}
          </span>
        )}
      </button>

      {open && (
        <Lightbox
          shots={shots}
          hasPhotos={hasPhotos}
          label={label}
          start={start}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
