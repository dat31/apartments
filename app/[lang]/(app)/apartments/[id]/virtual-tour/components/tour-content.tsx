import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { TourStage } from "./tour-stage";
import { PropertyPanel } from "./property-panel";
import { TourSummary } from "./tour-summary";
import { BookTourButton } from "../../components/book-tour-button";
import { NotOwner, OnlyOwner } from "../../components/viewer-is-owner";
import { getListingById } from "@/lib/services/listings";
import { getVirtualTour } from "@/lib/services/virtual-tours";
import { orderedScenes } from "@/lib/virtual-tour/scene-graph";
import { districtLabel } from "@/schemas/listing";

/* The listing-dependent half of the tour page. Async server component: it
   resolves the listing and its tour, then hands both to the client stage.

   Everything that *can* be server-rendered is: the header, the property
   panel and the phone-sized summary bar (price, availability, move-in
   estimate and the existing booking CTAs) arrive as ready-made slots, so the
   client stage owns only the canvas, the hotspots painted over it, and which
   room is on screen.

   Whether the viewer is the host is decided client-side, by the same
   <NotOwner> islands the detail page uses: reading the session here would
   read cookies during the render and cost this route its prerendered shell
   (see ../../components/viewer-is-owner). */
export async function TourContent({ id }: { id: string }) {
  const [listing, tour] = await Promise.all([getListingById(id), getVirtualTour(id)]);
  // No listing, or a listing whose tour isn't published: there is nothing to
  // walk through. The detail page stays the canonical surface for the home.
  if (!listing || !tour) notFound();

  const t = await getTranslations("virtualTour");
  const scenes = orderedScenes(tour.scenes);

  return (
    <TourStage
      tour={{ ...tour, scenes }}
      listingTitle={listing.title}
      panel={<PropertyPanel listing={listing} />}
      header={
        <div className="min-w-0">
          <Link
            href={`/apartments/${listing.id}`}
            className="focus-ring inline-flex items-center gap-1.5 text-[13px] font-medium text-white/70 hover:text-white"
          >
            <ArrowLeft size={15} /> {t("backToListing")}
          </Link>
          <h1 className="mt-0.5 truncate text-[15px] font-semibold sm:text-base">
            {listing.title}
          </h1>
          <p className="truncate text-[11.5px] text-white/65">
            {districtLabel(listing.district)}, {listing.city}
          </p>
          {/* The host's way into the editor, from the thing they are editing. */}
          <OnlyOwner ownerId={listing.owner}>
            <Link
              href={`/apartments/${listing.id}/virtual-tour/edit`}
              className="focus-ring mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-white/75 hover:text-white"
            >
              <Pencil size={13} /> {t("editTour")}
            </Link>
          </OnlyOwner>
        </div>
      }
      summary={<TourSummary listing={listing} />}
      cta={
        <NotOwner ownerId={listing.owner}>
          <BookTourButton listing={listing} mode="compact" />
        </NotOwner>
      }
    />
  );
}
