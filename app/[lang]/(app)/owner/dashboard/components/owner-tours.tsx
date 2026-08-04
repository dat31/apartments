import { getTranslations } from "next-intl/server";
import { OwnerTourCard } from "./owner-tour-card";
import { groupLiveOwnerTours, occupiedSlotsExcluding } from "../lib/tours";
import {
  listLiveTours,
  listPastTours,
  type TourWithListing,
} from "@/lib/services/tours";
import { getAvailability } from "@/lib/services/availability";
import { getSessionUser } from "@/lib/services/session";
import { type WeekTemplate } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { Calendar } from "lucide-react";

/* The tours an owner has received. Fetched, grouped and rendered on the
   server; only the button row of each card and its chat panel are islands.

   Two reads, because the two halves of the page age differently: what is still
   ahead is small and is what the tiles above count, while history only grows.
   Splitting them at the query means the live half stays a bounded read — see
   listLiveTours.

   The owner's availability comes along because a card may offer to propose a
   new time, and the picker needs the week to offer from. It is a public,
   cross-request cached read (tagged per owner), so asking for it here costs
   nothing on a warm tag. */
export async function OwnerTours() {
  const t = await getTranslations("dashboard.tours");
  const [live, past, user] = await Promise.all([
    listLiveTours("owner"),
    listPastTours("owner"),
    getSessionUser(),
  ]);
  const template: WeekTemplate = user ? await getAvailability(user.id) : {};

  if (live.length === 0 && past.length === 0) {
    return (
      <div className="bg-card p-16 text-center anim-fade">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-muted-foreground mb-4">
          <Calendar size={26} />
        </div>
        <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
        <p className="mt-1 text-muted-foreground text-pretty max-w-sm mx-auto">
          {t("emptyBody")}
        </p>
      </div>
    );
  }

  const groups = groupLiveOwnerTours(live);
  const card = (m: TourWithListing) => (
    <OwnerTourCard
      key={m.tour.id}
      tour={m.tour}
      listing={m.listing}
      template={template}
      /* Worked out per card, because the slot a card may offer is every slot
         this owner holds *except* the one that card is moving. Only the live
         tours can hold one: a day that has gone can't be double-booked. */
      occupied={occupiedSlotsExcluding(live, m.tour)}
    />
  );

  return (
    /* TODO: messaging temporarily removed from tour cards (broken). The
       MessagingProvider that opened one Stream connection for every card's
       inline TourChatPanel is dropped for now — restore both together, as
       renter-tours.tsx already had to. */
    <div className="anim-fade">
      <Section title={t("needsResponse")} items={groups.needsResponse} card={card} />
      <Section title={t("upcoming")} items={groups.upcoming} card={card} />
      {/* Already newest-first from the query: a closed tour is history, and
          history reads backwards. */}
      <Section title={t("past")} items={past} card={card} />
    </div>
  );
}

function Section({
  title,
  items,
  card,
}: {
  title: string;
  items: TourWithListing[];
  card: (m: TourWithListing) => React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-7">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-3 stagger">{items.map(card)}</div>
    </div>
  );
}
