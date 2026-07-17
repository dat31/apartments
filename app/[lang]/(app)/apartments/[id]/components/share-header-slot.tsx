import { ShareButton } from "@/components/share-button";
import { getListingById } from "@/lib/services/listings";
import { getListing } from "@/lib/data/listings";

/* Mobile-only share button for the back-to-results header row. Lives in its
   own Suspense boundary in the page shell so resolving the listing title (a
   cached read shared with the page/metadata) never blocks the instant shell or
   the detail skeleton. On tablet/desktop the share button sits beside the
   title instead (see DetailView), so this renders nothing there. */
export async function ShareHeaderSlot({ id }: { id: string }) {
  const listing = (await getListingById(id)) ?? getListing(id);
  if (!listing) return null;

  return (
    <ShareButton title={listing.title} variant="ghost" className="sm:hidden" />
  );
}
