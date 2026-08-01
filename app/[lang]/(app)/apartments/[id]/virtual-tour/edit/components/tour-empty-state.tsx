"use client";

import type * as React from "react";
import { useTranslations } from "next-intl";
import { Lightbulb, Rotate3d } from "lucide-react";
import { Button } from "@/components/ui/button";

/* Nothing yet — the state that decides whether a host starts at all.

   It teaches the one thing that blocks everything else: what kind of photo
   this page needs. Shown rather than defined, because "equirectangular" means
   nothing to someone who has just shot four rooms on a phone. */
export function TourEmptyState({
  uploader,
  onHowTo,
}: {
  /** The upload control itself, so there is exactly one of it on the page. */
  uploader: React.ReactNode;
  onHowTo: () => void;
}) {
  const t = useTranslations("virtualTourEditor");

  return (
    <div className="bg-card p-6 sm:p-10">
      <div className="max-w-160">
        <span className="inline-flex size-12 items-center justify-center bg-secondary text-muted-foreground">
          <Rotate3d size={24} />
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance">
          {t("emptyTitle")}
        </h2>
        <p className="mt-2 text-[15px] text-muted-foreground text-pretty">{t("emptyBody")}</p>

        <div className="mt-5 grid max-w-120 grid-cols-2 gap-3">
          {/* The shape *is* the explanation: a 360° photo is twice as wide as
              it is tall, and an ordinary one isn't. */}
          <div>
            <div className="aspect-[2/1] w-full bg-secondary" aria-hidden="true" />
            <p className="mt-1.5 text-[12.5px] font-medium">{t("emptyGood")}</p>
          </div>
          <div>
            <div className="grid aspect-[2/1] w-full place-items-center bg-muted" aria-hidden="true">
              <span className="h-full w-3/5 bg-secondary/60" />
            </div>
            <p className="mt-1.5 text-[12.5px] font-medium text-muted-foreground">
              {t("emptyBad")}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {uploader}
          <div>
            <Button type="button" variant="ghost" className="gap-1.5" onClick={onHowTo}>
              <Lightbulb size={17} /> {t("emptyHow")}
            </Button>
          </div>
        </div>

        <p className="mt-4 text-[13px] text-muted-foreground text-pretty">
          {t("emptyReassure")}
        </p>
      </div>
    </div>
  );
}
