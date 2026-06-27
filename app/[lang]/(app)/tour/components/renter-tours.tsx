"use client";

import * as React from "react";
import { Link } from "@/lib/i18n/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTours } from "@/hooks/use-tours";
import { useProfile } from "@/hooks/use-profile";
import { useListings } from "@/hooks/use-listings";
import { type TourRequest } from "@/schemas/tour";
import { Calendar, Search } from "lucide-react";
import { RenterTourCard } from "./renter-tour-card";

/* Sort order for the renter's tours: things that need their attention first. */
const ORDER: Record<TourRequest["status"], number> = {
  reschedule: 0,
  confirmed: 1,
  pending: 2,
  declined: 3,
};

export function RenterTours() {
  const { tours, acceptReschedule, declineTour, ready } = useTours();
  const { profile, ready: profileReady } = useProfile();
  const { getById } = useListings();

  const email = profile.email.trim();
  const mine = React.useMemo(() => {
    const list = tours.filter((t) => email && t.renterEmail === email);
    return [...list].sort(
      (a, b) =>
        ORDER[a.status] - ORDER[b.status] ||
        (a.date + a.time).localeCompare(b.date + b.time)
    );
  }, [tours, email]);

  const acceptNew = (id: string) => {
    acceptReschedule(id);
    toast.success("New time accepted", {
      description: "Your tour is confirmed for the proposed slot.",
    });
  };
  const decline = (id: string) => {
    declineTour(id);
    toast("Proposal declined");
  };
  const cancel = (id: string) => {
    declineTour(id);
    toast("Tour cancelled");
  };

  return (
    <div className="container mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2.5">
            <Calendar size={26} className="text-primary" /> My tours
          </h1>
          <p className="mt-1 text-muted-foreground">
            {mine.length === 0
              ? "Tours you book will show up here."
              : `${mine.length} tour request${mine.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button asChild variant="secondary" className="h-11 gap-1.5">
          <Link href="/apartments">
            <Search size={16} /> Browse homes
          </Link>
        </Button>
      </div>

      {!ready || !profileReady ? (
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
      ) : mine.length === 0 ? (
        <div className="bg-card p-16 text-center anim-fade">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
            <Calendar size={26} />
          </div>
          <h3 className="text-lg font-semibold">No tours booked yet</h3>
          <p className="mt-1 text-muted-foreground text-pretty max-w-sm mx-auto">
            Open any home and tap{" "}
            <span className="text-foreground font-medium">Book tour</span> to
            pick a time that works for you.
          </p>
          <Button asChild className="mt-5 h-11 gap-1.5">
            <Link href="/apartments">
              <Search size={16} /> Browse homes
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 stagger">
          {mine.map((t) => (
            <RenterTourCard
              key={t.id}
              tour={t}
              listing={getById(t.listingId) ?? null}
              onAcceptNew={acceptNew}
              onDecline={decline}
              onCancel={cancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
