"use client";

import * as React from "react";
import { useLocale, useTranslations, useFormatter } from "next-intl";
import { CalendarPlus, ChevronDown } from "lucide-react";
import { getPathname } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { GoogleMark, AppleMark } from "@/components/icons";
import { getOwner } from "@/lib/data/listings";
import { districtLabel, type Listing } from "@/schemas/listing";
import { type TourRequest } from "@/schemas/tour";
import { parseYmd } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import {
  tourEventTimes,
  googleCalUrl,
  outlookCalUrl,
  icsContent,
  type CalEvent,
} from "../lib/calendar";
import { TOUR_DURATION_MIN } from "../lib/route-plan";

/* Add a confirmed tour to the renter's calendar (improvement #5). Offers a
   Google Calendar template link, an Outlook compose link, and an .ics download
   for Apple / everything else — all client-side, no auth, no server work. A
   later reschedule simply re-offers this for the new slot; we don't try to
   update a previously exported event. */
export function AddToCalendar({
  tour,
  listing,
}: {
  tour: TourRequest;
  listing: Listing;
}) {
  const t = useTranslations("tour");
  const locale = useLocale() as Locale;
  const format = useFormatter();

  const { start, end } = tourEventTimes(tour);
  const fmtDate = format.dateTime(parseYmd(tour.date), {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const fmtTime = format.dateTime(start, { hour: "numeric", minute: "2-digit" });

  /* Built lazily (in a handler) so window.location.origin is always defined
     and the absolute listing/tours links resolve on whatever host we're on. */
  const buildEvent = (): CalEvent => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const listingUrl =
      origin + getPathname({ locale, href: `/apartments/${listing.id}` });
    const toursUrl = origin + getPathname({ locale, href: "/tour" });
    const ownerName = getOwner(tour.ownerKey)?.name ?? "";

    const details = [
      t("calendar.detailIntro"),
      ownerName && t("calendar.detailHost", { name: ownerName }),
      t("calendar.detailListing", { url: listingUrl }),
      t("calendar.detailManage", { url: toursUrl }),
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      start,
      end,
      title: t("calendar.eventTitle", { title: listing.title }),
      location: `${districtLabel(listing.district)}, ${listing.city}`,
      details,
    };
  };

  const openTab = (url: string) => window.open(url, "_blank", "noopener");

  const downloadIcs = () => {
    const url = URL.createObjectURL(
      new Blob([icsContent(buildEvent())], {
        type: "text/calendar;charset=utf-8",
      })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `danapa-tour-${tour.date}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const destinations = [
    {
      icon: <GoogleMark size={16} />,
      label: t("calendar.google"),
      sub: t("calendar.opensEvent"),
      onSelect: () => openTab(googleCalUrl(buildEvent())),
    },
    {
      icon: <CalendarPlus size={16} className="text-primary" />,
      label: t("calendar.outlook"),
      sub: t("calendar.opensEvent"),
      onSelect: () => openTab(outlookCalUrl(buildEvent())),
    },
    {
      icon: <AppleMark size={16} />,
      label: t("calendar.apple"),
      sub: t("calendar.downloadsIcs"),
      onSelect: downloadIcs,
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-1.5">
          <CalendarPlus size={16} /> {t("calendar.add")}
          <ChevronDown size={14} className="opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>
          {fmtDate} · {fmtTime} · {t("calendar.duration", { min: TOUR_DURATION_MIN })}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {destinations.map((d) => (
          <CalRow
            key={d.label}
            icon={d.icon}
            label={d.label}
            sub={d.sub}
            onSelect={d.onSelect}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* One destination row: a boxed icon plus a two-line label. */
function CalRow({
  icon,
  label,
  sub,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem onSelect={onSelect} className="gap-3 px-2 py-2">
      <span className="shrink-0 w-8 h-8 inline-flex items-center justify-center bg-secondary text-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight">{label}</span>
        <span className="block text-xs text-muted-foreground truncate">
          {sub}
        </span>
      </span>
    </DropdownMenuItem>
  );
}
