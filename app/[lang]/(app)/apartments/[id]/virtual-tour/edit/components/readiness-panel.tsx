"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, CircleAlert, CircleCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sceneById } from "@/lib/virtual-tour/scene-graph";
import type { TourIssue } from "@/lib/virtual-tour/scene-graph";
import type { Scene } from "@/schemas/virtual-tour";

/* What stands between this tour and a renter walking it.

   The two lists are deliberately unalike. Blocking issues describe a tour
   that would misbehave and are stated as *what to do*; advisory ones are
   folded away behind a count, because "no door leads into the bathroom yet"
   is a perfectly publishable state and reading it as a failure is what would
   stop the first tour anyone builds. */
export function ReadinessPanel({
  blocking,
  advisory,
  scenes,
  onFix,
}: {
  blocking: TourIssue[];
  advisory: TourIssue[];
  scenes: Scene[];
  /** Take the host to the room the issue is in. */
  onFix: (issue: TourIssue) => void;
}) {
  const t = useTranslations("virtualTourEditor");
  const [open, setOpen] = React.useState(false);

  const roomName = (issue: TourIssue) =>
    "sceneId" in issue ? (sceneById(scenes, issue.sceneId)?.name ?? "") : "";

  if (blocking.length === 0 && advisory.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {blocking.length > 0 && (
        <div className="bg-destructive/10 p-4 sm:p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-destructive">
            <CircleAlert size={17} /> {t("blockTitle", { count: blocking.length })}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {blocking.map((issue, i) => (
              <li
                key={`${issue.code}-${i}`}
                className="flex flex-wrap items-center justify-between gap-3 bg-background p-3.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-pretty">
                    {t(`issues.${issue.code}`)}
                  </p>
                  <p className="text-xs text-muted-foreground text-pretty">
                    {t(`issueFix.${issue.code}`, { room: roomName(issue) })}
                  </p>
                </div>
                {"sceneId" in issue && (
                  <Button type="button" size="sm" variant="secondary" onClick={() => onFix(issue)}>
                    {t("fix")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {blocking.length === 0 && advisory.length > 0 && (
        <div className="bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <CircleCheck size={17} className="text-primary" /> {t("readyTitle")}
            </p>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="focus-ring inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
            >
              {t("advisoryTitle", { count: advisory.length })}
              <ChevronDown size={15} className={cn("transition-transform", open && "rotate-180")} />
            </button>
          </div>
          {open && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {advisory.map((issue, i) => (
                <li
                  key={`${issue.code}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-3 bg-muted p-3.5"
                >
                  <p className="flex min-w-0 items-start gap-2 text-sm text-pretty">
                    <Info size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <span>
                      {t(`issues.${issue.code}`)}{" "}
                      <span className="text-muted-foreground">
                        {t(`issueFix.${issue.code}`, { room: roomName(issue) })}
                      </span>
                    </span>
                  </p>
                  {"sceneId" in issue && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => onFix(issue)}>
                      {t("fix")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
