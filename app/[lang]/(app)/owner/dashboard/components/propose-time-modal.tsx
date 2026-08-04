"use client";

import * as React from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MonthCalendar } from "@/app/[lang]/(app)/apartments/[id]/components/month-calendar";
import { TimeSlots } from "@/app/[lang]/(app)/apartments/[id]/components/time-slots";
import { type TourRequest } from "@/schemas/tour";
import {
  type WeekTemplate,
  openSlotsFor,
  parseYmd,
} from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { User } from "lucide-react";

/* Owner suggests an alternative slot to the renter, chosen from the owner's
   own availability minus already-booked slots.

   Takes the occupied slots ready-made rather than every tour the owner has:
   working them out needs the whole list *and* the session, both of which the
   server already has when it renders the card (occupiedSlotsExcluding, in
   ../lib/tours). What crosses to the browser is a list of "date|time" keys. */
export function ProposeTimeModal({
  open,
  onClose,
  tour,
  listingTitle,
  template,
  occupied,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  tour: TourRequest | null;
  listingTitle: string | null;
  template: WeekTemplate;
  occupied: string[];
  onSubmit: (id: string, date: string, time: string) => void;
}) {
  const t = useTranslations("dashboard.propose");
  const format = useFormatter();
  const fmtDateMed = (s: string) =>
    format.dateTime(parseYmd(s), {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  const fmtTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return format.dateTime(new Date(2000, 0, 1, h, m), {
      hour: "numeric",
      minute: "2-digit",
    });
  };
  // The parent remounts this modal per tour (via `key`), so fresh local
  // state here is naturally empty — no reset effect needed.
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");

  const occupiedSlots = React.useMemo(() => new Set(occupied), [occupied]);
  const slots = date ? openSlotsFor(template, date, occupiedSlots) : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 gap-0 max-h-[88vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-5 pb-6 overflow-y-auto">
          {tour && (
            <div className="flex flex-wrap items-center gap-2.5 bg-secondary p-3 mb-5 text-sm">
              <User size={16} className="text-primary shrink-0" />
              <span className="font-medium">{tour.renterName}</span>
              {listingTitle && (
                <span className="text-muted-foreground truncate">
                  · {listingTitle}
                </span>
              )}
              <span className="text-muted-foreground">
                ·{" "}
                {t("originally", {
                  date: fmtDateMed(tour.date),
                  time: fmtTime(tour.time),
                })}
              </span>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-5">
            <MonthCalendar
              template={template}
              occupied={occupiedSlots}
              selected={date}
              onSelect={(d) => {
                setDate(d);
                setTime("");
              }}
            />
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                {date ? fmtDateMed(date) : t("pickDateFirst")}
              </h4>
              {date ? (
                <TimeSlots slots={slots} value={time} onPick={setTime} />
              ) : (
                <div className="bg-card p-6 text-sm text-muted-foreground text-center">
                  {t("selectDayHint")}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button
              disabled={!date || !time || !tour}
              onClick={() => tour && onSubmit(tour.id, date, time)}
            >
              {t("send")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
