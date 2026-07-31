import { useTranslations } from "next-intl";
import { AvailabilityLabel } from "../../components/availability-label";
import { useMoney } from "@/hooks/use-money";
import type { Listing } from "@/schemas/listing";

/* The collapsed phone bar's content: the two facts that decide whether the
   tour was worth taking, and nothing else. Tapping the bar unfolds the full
   essentials panel above it.

   A component rather than inline JSX in TourContent, for the same reason
   PropertyPanel is one: slots handed to the client stage cross the server /
   client boundary, and a lone component element crosses it cleanly where a
   hand-built tree of elements around a client island (AvailabilityLabel)
   does not — React loses the children's static-ness on the way over and
   warns about missing keys. */
export function TourSummary({ listing }: { listing: Listing }) {
  const t = useTranslations("detail");
  const money = useMoney();

  return (
    <span className="min-w-0">
      <span className="block text-[15px] font-semibold tracking-tight">
        {money(listing.price)}
        <span className="text-[12px] font-normal text-white/70">
          {t("perMonthShort")}
        </span>
      </span>
      <span className="block truncate text-[11.5px] text-white/70">
        <AvailabilityLabel listing={listing} />
      </span>
    </span>
  );
}
