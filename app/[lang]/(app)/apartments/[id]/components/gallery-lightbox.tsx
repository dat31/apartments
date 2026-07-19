"use client";

import * as React from "react";
import dynamic from "next/dynamic";

/* Lazy boundary for the lightbox: embla-carousel only ships once a photo is
   clicked, keeping it out of the detail page's initial bundle. No loading
   fallback — the overlay simply appears when the chunk lands. */
const Lightbox = dynamic(() => import("./lightbox").then((m) => m.Lightbox), {
  ssr: false,
});

/* Thin client island wrapping the server-rendered gallery mosaic. It owns the
   gallery's only interactive concern — opening the fullscreen lightbox — via
   click delegation: any element inside carrying `data-shot="<index>"` opens
   the carousel at that photo. This `display: contents` wrapper adds no box of
   its own, so all the image markup can render on the server while the client
   bundle stays limited to this handler plus the lazily-loaded lightbox. */
export function GalleryLightbox({
  shots,
  hasPhotos,
  label,
  children,
}: {
  shots: string[];
  hasPhotos: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [start, setStart] = React.useState(0);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-shot]");
    if (!el) return;
    const i = Number(el.dataset.shot);
    if (Number.isNaN(i)) return;
    setStart(i);
    setOpen(true);
  };

  return (
    <div className="contents" onClick={onClick}>
      {children}
      {open && (
        <Lightbox
          shots={shots}
          hasPhotos={hasPhotos}
          label={label}
          start={start}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
