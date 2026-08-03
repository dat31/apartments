import { getTranslations } from "next-intl/server";
import { OwnerTourCard } from "./owner-tour-card";
import { groupOwnerTours, occupiedSlotsExcluding } from "../lib/tours";
import { listTours, type TourWithListing } from "@/lib/services/tours";
import { getAvailability } from "@/lib/services/availability";
import { getSessionUser } from "@/lib/services/session";
import { type WeekTemplate } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { Calendar } from "lucide-react";
import { MessagingProvider } from "@/components/messaging/chat-provider";

/* The tours an owner has received. Fetched, grouped and rendered on the
   server; only the button row of each card and its chat panel are islands.

   The owner's availability comes along because a card may offer to propose a
   new time, and the picker needs the week to offer from. It is a public,
   cross-request cached read (tagged per owner), so asking for it here costs
   nothing on a warm tag. */
export async function OwnerTours() {
  const t = await getTranslations("dashboard.tours");
  const [items, user] = await Promise.all([listTours("owner"), getSessionUser()]);
  const template: WeekTemplate = user ? await getAvailability(user.id) : {};

  if (items.length === 0) {
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

  const groups = groupOwnerTours(items);
  const card = (m: TourWithListing) => (
    <OwnerTourCard
      key={m.tour.id}
      tour={m.tour}
      listing={m.listing}
      template={template}
      /* Worked out per card, because the slot a card may offer is every slot
         this owner holds *except* the one that card is moving. */
      occupied={occupiedSlotsExcluding(items, m.tour)}
    />
  );

  return (
    /* One Stream connection for every card's chat panel; children render
       immediately, so the dashboard never waits on the socket. A client
       component wrapping server-rendered children — the cards below stay
       Server Components. */
    <MessagingProvider>
      <div className="anim-fade">
        <Section title={t("needsResponse")} items={groups.needsResponse} card={card} />
        <Section title={t("upcoming")} items={groups.upcoming} card={card} />
        <Section title={t("past")} items={groups.past} card={card} />
      </div>
    </MessagingProvider>
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
