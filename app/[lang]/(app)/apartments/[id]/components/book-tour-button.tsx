"use client";

import * as React from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Calendar, CircleCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveTour } from "@/hooks/use-active-tour";
import { parseYmd } from "../constants/tours";
import { type TourRequest } from "@/schemas/tour";
import { type Listing } from "@/schemas/listing";
import { BookTourDialog } from "./book-tour-dialog";

/* The booking call-to-action on the apartment detail page — owns the dialog
   open state so the booking card stays a Server Component. Rendered once per
   layout (desktop aside = "full", mobile bar = "compact"); only one is visible
   at a breakpoint.

   It fetches the renter's active tour for this listing (react-query) and, when
   one exists, swaps the "Book tour" button for an "already booked" surface that
   routes to the tour manager — a renter holds only one live tour per home. */
export function BookTourButton({
  listing,
  mode,
}: {
  listing: Listing;
  mode: "full" | "compact";
}) {
  const t = useTranslations("tours");
  const { tour, isLoading } = useActiveTour(listing.id);
  const [open, setOpen] = React.useState(false);

  // Gate the auth-dependent CTA on mount: the server (auth never resolves during
  // SSR) and the first client render both show the loading skeleton, then the
  // real book / booked state reveals after mount — avoids a hydration mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const loading = !mounted || isLoading;

  return (
    <>
      {loading ? (
        mode === "full" ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <Skeleton className="h-11 w-28" />
        )
      ) : tour ? (
        <BookedState tour={tour} mode={mode} />
      ) : mode === "full" ? (
        <Button size="lg" className="h-12 gap-2" onClick={() => setOpen(true)}>
          <Calendar size={18} /> {t("bookTour")}
        </Button>
      ) : (
        <Button className="h-11 gap-2" onClick={() => setOpen(true)}>
          <Calendar size={18} /> {t("bookTour")}
        </Button>
      )}

      {/* Kept mounted independent of the guard state above: after a successful
          booking the active-tour query flips to "booked", but the dialog must
          stay open on its success screen until the user dismisses it. */}
      {(open || !tour) && (
        <BookTourDialog
          open={open}
          onClose={() => setOpen(false)}
          listing={listing}
        />
      )}
    </>
  );
}

/* A live tour exists — surface it and route to the tour manager instead of
   opening a second booking. */
function BookedState({
  tour,
  mode,
}: {
  tour: TourRequest;
  mode: "full" | "compact";
}) {
  const t = useTranslations("tours");
  const format = useFormatter();
  const dateMed = format.dateTime(parseYmd(tour.date), {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const [h, m] = tour.time.split(":").map(Number);
  const time = format.dateTime(new Date(2000, 0, 1, h, m), {
    hour: "numeric",
    minute: "2-digit",
  });
  // guardStatus only covers the three active states this component ever sees.
  const statusKey =
    tour.status === "confirmed"
      ? "confirmed"
      : tour.status === "reschedule"
        ? "reschedule"
        : "pending";

  if (mode === "compact") {
    return (
      <Button asChild variant="secondary">
        <Link href="/tour">
          <CircleCheck size={18} /> {t("booked")}
        </Link>
      </Button>
    );
  }

  return (
    <>
      <div className="bg-secondary p-3.5">
        <p className="flex items-center gap-2 text-sm font-medium">
          <CircleCheck size={17} className="text-primary shrink-0" />
          {t(`guardStatus.${statusKey}`)}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar size={14} /> {dateMed} · {time}
        </p>
      </div>
      <Button asChild size="lg" className="h-12 gap-2">
        <Link href="/tour">
          <Calendar size={18} /> {t("manageTour")}
        </Link>
      </Button>
    </>
  );
}
