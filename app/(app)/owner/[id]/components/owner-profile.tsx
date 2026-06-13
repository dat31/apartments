"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "@/components/listing-card";
import { ReviewCard } from "@/components/review-card";
import { StarRow } from "@/components/star-row";
import { ReviewModal } from "./review-modal";
import { useSaved } from "@/hooks/use-saved";
import {
  IconLeft,
  IconPin,
  IconCalendar,
  IconMessage,
  IconClock,
  IconGlobe,
  IconShield,
  IconCheck,
  IconStar,
  IconBuilding,
} from "@/components/icons";
import {
  type Owner,
  type Review,
  type Listing,
  PALETTE,
  monthLabel,
  initialsOf,
  avgOf,
} from "@/lib/data/listings";
import { type ReviewFormValues } from "../schemas/review";

export function OwnerProfile({
  owner,
  homes,
  reviews: initialReviews,
}: {
  owner: Owner;
  homes: Listing[];
  reviews: Review[];
}) {
  const router = useRouter();
  const { isSaved, toggleSave } = useSaved();
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [reviews, setReviews] = React.useState<Review[]>(initialReviews);

  const isYou = owner.key === "you";
  const displayName = isYou ? "You" : owner.name;
  const firstName = owner.name.split(" ")[0];
  const avg = avgOf(reviews);
  const color = PALETTE[owner.palette % PALETTE.length][0];

  const dist = [5, 4, 3, 2, 1].map((s) => ({
    s,
    n: reviews.filter((r) => r.rating === s).length,
  }));
  const maxN = Math.max(1, ...dist.map((d) => d.n));

  const addReview = (data: ReviewFormValues) => {
    const r: Review = {
      id: "r" + Date.now(),
      owner: owner.key,
      author: data.author,
      rating: data.rating,
      text: data.text,
      date: new Date().toISOString().slice(0, 7),
      initials: data.author
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase(),
    };
    setReviews((rs) => [r, ...rs]);
  };

  const stats = [
    { label: "Member since", value: monthLabel(owner.joined) || "—", icon: IconCalendar },
    { label: "Response rate", value: `${owner.responseRate}%`, icon: IconMessage },
    { label: "Responds", value: owner.responseTime, icon: IconClock },
    { label: "Languages", value: owner.languages.join(", "), icon: IconGlobe },
  ];

  return (
    <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-6 anim-up">
      <button
        onClick={() => router.push("/apartments")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-5 focus-ring"
      >
        <IconLeft size={18} /> Back
      </button>

      {/* Hero */}
      <section className="bg-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
          <div
            className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 grid place-items-center"
            style={{ background: color }}
          >
            <span className="text-3xl sm:text-4xl font-semibold text-background/95 select-none">
              {initialsOf(owner.name)}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {owner.superhost && (
                <Badge>
                  <IconShield size={13} /> Superhost
                </Badge>
              )}
              {owner.verified && (
                <Badge variant="secondary">
                  <IconCheck size={13} /> Verified
                </Badge>
              )}
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
              {displayName}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <IconPin size={16} /> {owner.location}
              </span>
              <span className="flex items-center gap-1.5">
                <IconCalendar size={16} /> Joined {monthLabel(owner.joined)}
              </span>
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground text-pretty max-w-xl">
              {owner.bio}
            </p>
          </div>

          <div className="sm:w-44 shrink-0 bg-secondary text-secondary-foreground p-5 flex sm:flex-col items-center sm:text-center gap-4 sm:gap-1.5">
            <div className="text-5xl font-semibold tracking-tight tabular-nums leading-none">
              {reviews.length ? avg.toFixed(1) : "—"}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <StarRow value={avg} size={17} />
              <p className="text-sm text-muted-foreground">
                {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {stats.map(({ label, value, icon: I }) => (
            <div key={label} className="bg-card px-4 py-4">
              <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                <I size={14} /> {label}
              </span>
              <p className="mt-1.5 font-medium capitalize leading-snug">
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Reviews</h2>
            <p className="mt-1 flex items-center gap-2 text-muted-foreground">
              <StarRow value={avg} size={16} />
              <span className="text-foreground font-medium tabular-nums">
                {reviews.length ? avg.toFixed(1) : "—"}
              </span>
              · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button className="h-11 gap-1.5" onClick={() => setReviewOpen(true)}>
            <IconStar size={17} /> Write a review
          </Button>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-card p-14 text-center anim-fade">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
              <IconStar size={26} />
            </div>
            <h3 className="text-lg font-semibold">No reviews yet</h3>
            <p className="mt-1 text-muted-foreground text-pretty max-w-sm mx-auto">
              Be the first to share what it&apos;s like renting from {firstName}.
            </p>
            <Button
              className="mt-5 h-11 gap-1.5"
              onClick={() => setReviewOpen(true)}
            >
              <IconStar size={17} /> Write a review
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[260px_1fr] gap-8">
            <div className="bg-card p-5 self-start lg:sticky lg:top-24">
              <p className="text-sm font-medium mb-3">Rating breakdown</p>
              <div className="flex flex-col gap-2">
                {dist.map(({ s, n }) => (
                  <div key={s} className="flex items-center gap-2.5 text-sm">
                    <span className="flex items-center gap-1 w-9 text-muted-foreground tabular-nums">
                      {s}{" "}
                      <IconStar filled size={12} className="text-primary" />
                    </span>
                    <span className="flex-1 h-2 bg-muted overflow-hidden">
                      <span
                        className="block h-full bg-primary"
                        style={{ width: `${(n / maxN) * 100}%` }}
                      />
                    </span>
                    <span className="w-5 text-right text-muted-foreground tabular-nums">
                      {n}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 stagger">
              {reviews.map((r) => (
                <ReviewCard key={r.id} r={r} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Their homes */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">
          {homes.length} home{homes.length !== 1 ? "s" : ""} by {firstName}
        </h2>
        <p className="text-muted-foreground mb-5">
          Active listings you can rent right now.
        </p>
        {homes.length === 0 ? (
          <div className="bg-card p-14 text-center anim-fade">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
              <IconBuilding size={26} />
            </div>
            <p className="text-muted-foreground">
              {firstName} has no active listings at the moment.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
            {homes.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                saved={isSaved(l.id)}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
        )}
      </section>

      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        firstName={firstName}
        onSubmit={addReview}
      />
    </div>
  );
}
