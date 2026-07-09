"use client";

import * as React from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { ListingCard } from "@/components/listing-card";
import { ReviewCard } from "@/components/review-card";
import { StarRow } from "@/components/star-row";
import {
  reviewPageCount,
  reviewsForPage,
} from "@/app/[lang]/(app)/apartments/[id]/lib/reviews";
import { ReviewModal } from "./review-modal";
import { Building2, Calendar, Check, ChevronLeft, ChevronRight, Clock, Globe, MessageSquare, ShieldCheck, Star } from "lucide-react";
import { PALETTE, initialsOf, avgOf } from "@/lib/data/listings";
import { type Listing } from "@/schemas/listing";
import { type Owner } from "@/schemas/owner";
import { type Review, type ReviewFormValues } from "@/schemas/review";

/* Homes shown before the "See all" affordance takes over. */
const HOMES_PREVIEW = 3;

export function OwnerProfile({
  owner,
  homes,
  reviews: initialReviews,
}: {
  owner: Owner;
  homes: Listing[];
  reviews: Review[];
}) {
  const t = useTranslations("owner");
  const tr = useTranslations("detail.reviews");
  const format = useFormatter();
  const router = useRouter();
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [reviews, setReviews] = React.useState<Review[]>(initialReviews);
  const [page, setPage] = React.useState(1);

  const pageCount = reviewPageCount(reviews);
  const safePage = Math.min(page, pageCount);
  const pageReviews = reviewsForPage(reviews, safePage);

  const isYou = owner.key === "you";
  const displayName = isYou ? t("you") : owner.name;
  const firstName = owner.name.split(" ")[0];
  // "Their homes" shows a preview; "See all" carries the owner over to the
  // browse page as a filter (?owner=<key>).
  const homesHref = `/apartments?owner=${encodeURIComponent(owner.key)}`;
  const avg = avgOf(reviews);
  const color = PALETTE[owner.palette % PALETTE.length][0];

  // owner.joined is a "YYYY-MM" key → locale month + year.
  const [jy, jm] = owner.joined.split("-").map(Number);
  const joinedLabel = format.dateTime(new Date(jy, jm - 1, 1), {
    month: "long",
    year: "numeric",
  });
  // Localize the small fixed sets of seed values shown in the stats.
  const RESPONSE_TIME_KEY: Record<string, string> = {
    "within an hour": "hour",
    "within a few hours": "fewHours",
    "within a day": "day",
  };
  const respondsValue = RESPONSE_TIME_KEY[owner.responseTime]
    ? t(`responseTime.${RESPONSE_TIME_KEY[owner.responseTime]}`)
    : owner.responseTime;
  const languagesValue = owner.languages
    .map((l) => t(`language.${l.toLowerCase()}`))
    .join(", ");

  const dist = [5, 4, 3, 2, 1].map((s) => ({
    s,
    n: reviews.filter((r) => r.rating === s).length,
  }));
  const maxN = Math.max(1, ...dist.map((d) => d.n));

  const addReview = (data: ReviewFormValues) => {
    // Event-time values for the new review (unique id + current month).
    // Impure by nature but this runs on submit, not during render.
    /* eslint-disable react-hooks/purity */
    const id = "r" + Date.now();
    const date = new Date().toISOString().slice(0, 7);
    /* eslint-enable react-hooks/purity */
    const r: Review = {
      id,
      owner: owner.key,
      author: data.author,
      rating: data.rating,
      text: data.text,
      date,
      initials: data.author
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase(),
    };
    setReviews((rs) => [r, ...rs]);
    setPage(1); // jump back so the new review is visible at the top
    toast.success(t("reviewPosted"), {
      description: t("reviewPostedDesc", { name: firstName }),
    });
  };

  const stats = [
    { label: t("stats.memberSince"), value: joinedLabel || "—", icon: Calendar },
    { label: t("stats.responseRate"), value: `${owner.responseRate}%`, icon: MessageSquare },
    { label: t("stats.responds"), value: respondsValue, icon: Clock },
    { label: t("stats.languages"), value: languagesValue, icon: Globe },
  ];

  return (
    <div className="container mx-auto px-5 sm:px-8 py-6 anim-up">
      <button
        onClick={() => router.push("/apartments")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-5 focus-ring"
      >
        <ChevronLeft size={18} /> {t("back")}
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
                  <ShieldCheck size={13} /> {t("superhost")}
                </Badge>
              )}
              {owner.verified && (
                <Badge variant="secondary">
                  <Check size={13} /> {t("verified")}
                </Badge>
              )}
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
              {displayName}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar size={16} /> {t("joined", { date: joinedLabel })}
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
                {tr("count", { count: reviews.length })}
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
            <h2 className="text-2xl font-semibold tracking-tight">
              {tr("title")}
            </h2>
            <p className="mt-1 flex items-center gap-2 text-muted-foreground">
              <StarRow value={avg} size={16} />
              <span className="text-foreground font-medium tabular-nums">
                {reviews.length ? avg.toFixed(1) : "—"}
              </span>
              · {tr("count", { count: reviews.length })}
            </p>
          </div>
          <Button className="h-11 gap-1.5" onClick={() => setReviewOpen(true)}>
            <Star size={17} /> {t("writeReview")}
          </Button>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-card p-14 text-center anim-fade">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
              <Star size={26} />
            </div>
            <h3 className="text-lg font-semibold">{tr("emptyTitle")}</h3>
            <p className="mt-1 text-muted-foreground text-pretty max-w-sm mx-auto">
              {t("reviewsEmptyBody", { name: firstName })}
            </p>
            <Button
              className="mt-5 h-11 gap-1.5"
              onClick={() => setReviewOpen(true)}
            >
              <Star size={17} /> Write a review
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[260px_1fr] gap-8">
            <div className="bg-card p-5 self-start lg:sticky lg:top-24">
              <p className="text-sm font-medium mb-3">{t("ratingBreakdown")}</p>
              <div className="flex flex-col gap-2">
                {dist.map(({ s, n }) => (
                  <div key={s} className="flex items-center gap-2.5 text-sm">
                    <span className="flex items-center gap-1 w-9 text-muted-foreground tabular-nums">
                      {s}{" "}
                      <Star fill="currentColor" size={12} className="text-primary" />
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
            <div>
              <div key={safePage} className="grid sm:grid-cols-2 gap-4 stagger">
                {pageReviews.map((r) => (
                  <ReviewCard key={r.id} r={r} />
                ))}
              </div>

              {pageCount > 1 && (
                <Pagination
                  aria-label={tr("pagination")}
                  className="mt-6 justify-center"
                >
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        text={tr("prev")}
                        aria-disabled={safePage <= 1}
                        className={cn(
                          safePage <= 1 && "pointer-events-none opacity-40"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage((p) => Math.max(1, p - 1));
                        }}
                      />
                    </PaginationItem>
                    {Array.from({ length: pageCount }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          isActive={i + 1 === safePage}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(i + 1);
                          }}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        text={tr("next")}
                        aria-disabled={safePage >= pageCount}
                        className={cn(
                          safePage >= pageCount &&
                            "pointer-events-none opacity-40"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage((p) => Math.min(pageCount, p + 1));
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Their homes */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("homesBy", { count: homes.length, name: firstName })}
          </h2>
          {homes.length > HOMES_PREVIEW && (
            <Link
              href={homesHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline focus-ring whitespace-nowrap"
            >
              {t("seeAll", { count: homes.length })} <ChevronRight size={15} />
            </Link>
          )}
        </div>
        <p className="text-muted-foreground mb-5">{t("homesSubtitle")}</p>
        {homes.length === 0 ? (
          <div className="bg-card p-14 text-center anim-fade">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
              <Building2 size={26} />
            </div>
            <p className="text-muted-foreground">
              {t("noListings", { name: firstName })}
            </p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
              {homes.slice(0, HOMES_PREVIEW).map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
            {homes.length > HOMES_PREVIEW && (
              <div className="mt-6 flex justify-center">
                <Button
                  asChild
                  variant="secondary"
                  size="lg"
                  className="h-11 gap-1.5"
                >
                  <Link href={homesHref}>
                    {t("seeAllHomes", { count: homes.length, name: firstName })}
                    <ChevronRight size={17} />
                  </Link>
                </Button>
              </div>
            )}
          </>
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
