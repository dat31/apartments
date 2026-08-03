import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { ShareButton } from "@/components/share-button";
import { getListingById } from "@/lib/services/listings";
import { formatMoney } from "@/lib/money";
import { districtLabel, localizeListing } from "@/schemas/listing";

/* Mobile-only share button for the back-to-results header row. Lives in its
   own Suspense boundary in the page shell so resolving the listing title (a
   cached read shared with the page/metadata) never blocks the instant shell or
   the detail skeleton. On tablet/desktop the share button sits beside the
   title instead (see DetailView), so this renders nothing there. */
export async function ShareHeaderSlot({ id }: { id: string }) {
  const found = await getListingById(id);
  if (!found) return null;

  const [t, format, locale] = await Promise.all([
    getTranslations("detail"),
    getFormatter(),
    getLocale(),
  ]);
  // Share the title in the language the reader is looking at, not the one the
  // owner happened to write first.
  const listing = localizeListing(found, locale);
  const text = t("shareText", {
    title: listing.title,
    price: formatMoney(format, locale, listing.price),
    district: districtLabel(listing.district),
    city: listing.city,
  });

  return (
    <ShareButton
      title={listing.title}
      text={text}
      variant="ghost"
      className="sm:hidden"
    />
  );
}
