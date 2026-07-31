import { useTranslations } from "next-intl";
import { Bath, BedDouble, Maximize } from "lucide-react";
import { AvailabilityLabel } from "../../components/availability-label";
import { BookTourButton } from "../../components/book-tour-button";
import { MoveInEstimate } from "../../components/move-in-estimate";
import { SaveHomeButton } from "../../components/save-home-button";
import { NotOwner } from "../../components/viewer-is-owner";
import { MessageOwnerButton } from "@/components/messaging/message-owner-button";
import { useMoney } from "@/hooks/use-money";
import type { Listing } from "@/schemas/listing";

/* The property info that rides along with the tour: the money, the facts,
   and the same CTAs as the detail page's booking card — literally the same
   components, so pricing, the move-in estimate, the shortlist and the "you
   already have a tour booked" state all behave identically here. Nothing
   about booking is reimplemented for this surface.

   A sync Server Component (like DetailView): it renders on the server and is
   handed to the client stage as a slot, so none of this markup ships as JS. */
export function PropertyPanel({ listing }: { listing: Listing }) {
  const t = useTranslations("virtualTour");
  const td = useTranslations("detail");
  const ta = useTranslations("apartments");
  const money = useMoney();

  const facts = [
    {
      icon: BedDouble,
      label:
        listing.beds === 0 ? ta("card.studio") : ta("card.beds", { count: listing.beds }),
    },
    { icon: Bath, label: td("baths", { count: listing.baths }) },
    { icon: Maximize, label: `${listing.area} m²` },
  ];

  return (
    <div>
      <h2 className="sr-only">{t("propertyPanelTitle")}</h2>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight">
          {money(listing.price)}
        </span>
        <span className="text-muted-foreground">{td("perMonth")}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-primary">
        <AvailabilityLabel listing={listing} />
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {facts.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-2 bg-secondary px-3 py-2 text-sm text-secondary-foreground"
          >
            <Icon size={16} className="text-primary" /> {label}
          </span>
        ))}
      </div>

      <MoveInEstimate listing={listing} variant="compact" className="mt-4" />

      <div className="mt-5 flex flex-col gap-2.5">
        <NotOwner ownerId={listing.owner}>
          <BookTourButton listing={listing} mode="full" />
        </NotOwner>
        <SaveHomeButton id={listing.id} mode="full" />
        <NotOwner ownerId={listing.owner}>
          <MessageOwnerButton listingId={listing.id} />
        </NotOwner>
      </div>

      <p className="mt-4 text-xs text-muted-foreground text-pretty">{t("panelNote")}</p>
    </div>
  );
}
