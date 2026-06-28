"use client";

import { useTranslations, useFormatter } from "next-intl";
import { availInfo } from "@/lib/data/listings";
import { type Listing } from "@/schemas/listing";

/* The availability label compares the listing date against "now", so it must
   be computed at request time on the client rather than baked into the static
   prerender. */
export function AvailabilityLabel({ listing }: { listing: Listing }) {
  const t = useTranslations("apartments.card");
  const format = useFormatter();
  const avail = availInfo(listing);
  return (
    <>
      {avail.kind === "now"
        ? t("availableNow")
        : t("availableOn", {
            date: format.dateTime(avail.date, {
              month: "short",
              day: "numeric",
            }),
          })}
    </>
  );
}
