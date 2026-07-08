"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyTours, type MyTour } from "@/hooks/use-my-tours";
import { type TourRequest } from "@/schemas/tour";
import { parseYmd } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { Calendar, Search } from "lucide-react";
import { RenterTourCard } from "./renter-tour-card";
import { TourDayRoute } from "./tour-day-route";
import { groupTourDays } from "../lib/route-plan";

/* Sort order for the history section: things that need attention first. */
const ORDER: Record<TourRequest["status"], number> = {
  reschedule: 0,
  confirmed: 1,
  pending: 2,
  declined: 3,
};

export function RenterTours() {
  const t = useTranslations("tour");
  const format = useFormatter();
  const { items, acceptReschedule, declineTour, ready } = useMyTours();

  /* Upcoming tours grouped into day sections (each day with ≥2 routeable
     stops gets the route view); everything else — past dates and declined —
     goes to the history list below. */
  const { days, history } = React.useMemo(() => {
    const days = groupTourDays(items);
    const upcoming = new Set(
      days.flatMap((d) => d.items).map((m: MyTour) => m.tour.id)
    );
    const history = items
      .filter((m) => !upcoming.has(m.tour.id))
      .sort(
        (a, b) =>
          ORDER[a.tour.status] - ORDER[b.tour.status] ||
          (b.tour.date + b.tour.time).localeCompare(a.tour.date + a.tour.time)
      );
    return { days, history };
  }, [items]);

  const total = items.length;

  const acceptNew = (id: string) => {
    acceptReschedule(id);
    toast.success(t("toastAccepted"), {
      description: t("toastAcceptedDesc"),
    });
  };
  const decline = (id: string) => {
    declineTour(id);
    toast(t("toastDeclined"));
  };
  const cancel = (id: string) => {
    declineTour(id);
    toast(t("toastCancelled"));
  };

  return (
    <div className="container mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2.5">
            <Calendar size={26} className="text-primary" /> {t("title")}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {total === 0 ? t("emptyHint") : t("countSub", { count: total })}
          </p>
        </div>
        <Button asChild variant="secondary" className="h-11 gap-1.5">
          <Link href="/apartments">
            <Search size={16} /> {t("browseHomes")}
          </Link>
        </Button>
      </div>

      {!ready ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card flex flex-col sm:flex-row">
              <div className="sm:w-52 shrink-0 overflow-hidden sm:self-stretch">
                <Skeleton className="aspect-[16/9] sm:aspect-auto sm:h-full w-full" />
              </div>
              <div className="flex-1 p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex flex-col gap-1.5">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-9 w-36" />
                </div>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-auto h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <div className="bg-card p-16 text-center anim-fade">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
            <Calendar size={26} />
          </div>
          <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-1 text-muted-foreground text-pretty max-w-sm mx-auto">
            {t.rich("emptyBody", {
              b: (chunks) => (
                <span className="text-foreground font-medium">{chunks}</span>
              ),
            })}
          </p>
          <Button asChild className="mt-5 h-11 gap-1.5">
            <Link href="/apartments">
              <Search size={16} /> {t("browseHomes")}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {days.map((day) => (
            <section key={day.date}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {format.dateTime(parseYmd(day.date), {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <div className="flex flex-col gap-3 stagger">
                {day.items.map(({ tour, listing }) => (
                  <RenterTourCard
                    key={tour.id}
                    tour={tour}
                    listing={listing}
                    onAcceptNew={acceptNew}
                    onDecline={decline}
                    onCancel={cancel}
                  />
                ))}
              </div>
              {day.stops.length >= 2 && <TourDayRoute stops={day.stops} />}
            </section>
          ))}
          {history.length > 0 && (
            <section>
              {days.length > 0 && (
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("historySection")}
                </h2>
              )}
              <div className="flex flex-col gap-3 stagger">
                {history.map(({ tour, listing }) => (
                  <RenterTourCard
                    key={tour.id}
                    tour={tour}
                    listing={listing}
                    onAcceptNew={acceptNew}
                    onDecline={decline}
                    onCancel={cancel}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
