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

   Facts are label-left / value-right rows rather than the detail page's
   chips: this panel is glass over a photograph, and a column of aligned
   numbers stays readable where a wrapping row of pills does not.

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
      label: t("bedsLabel"),
      value: listing.beds === 0 ? ta("card.studio") : String(listing.beds),
    },
    { icon: Bath, label: t("bathsLabel"), value: String(listing.baths) },
    { icon: Maximize, label: t("sizeLabel"), value: `${listing.area} m²` },
  ];

  return (
    <div>
      <h2 className="sr-only">{t("propertyPanelTitle")}</h2>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[26px] font-semibold tracking-tight">
          {money(listing.price)}
        </span>
        <span className="text-[13px] text-white/70">{td("perMonth")}</span>
      </div>
      <p className="mt-1 text-[13px] font-medium text-white/85">
        <AvailabilityLabel listing={listing} />
      </p>

      <div className="mt-5 flex flex-col gap-2.5">
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex min-w-0 items-center gap-2.5">
            <Icon size={16} className="shrink-0 text-white/70" />
            <span className="text-[13px] text-white/70">{label}</span>
            <span className="ml-auto text-right text-[13.5px] font-semibold tabular-nums">
              {value}
            </span>
          </div>
        ))}
      </div>

      <MoveInEstimate listing={listing} variant="compact" className="mt-5" />

      <div className="mt-5 flex flex-col gap-2.5">
        <NotOwner ownerId={listing.owner}>
          <BookTourButton listing={listing} mode="full" />
        </NotOwner>
        <SaveHomeButton id={listing.id} mode="full" />
        <NotOwner ownerId={listing.owner}>
          <MessageOwnerButton listingId={listing.id} />
        </NotOwner>
      </div>

      <p className="mt-4 text-[11.5px] leading-snug text-white/65 text-pretty">
        {t("panelNote")}
      </p>
    </div>
  );
}
