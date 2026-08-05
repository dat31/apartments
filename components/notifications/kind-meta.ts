import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Home,
  Star,
  type LucideIcon,
} from "lucide-react";
import {
  type NotificationCategory,
  type NotificationKind,
} from "@/schemas/notification";

/* What a kind looks like and what it says.

   Shared by the bell popover's row and the page's, so the same notification
   can't pick up a different icon or a different sentence depending on where it
   is read. Both maps are keyed by the kind union rather than derived from it,
   so adding a kind fails to compile here — next to the two things it needs.

   Not a component file: these are lookups, and keeping them out of the rows
   is what lets the two surfaces render the same news in their own layouts. */

export const NOTIFICATION_ICONS: Record<NotificationKind, LucideIcon> = {
  tour_requested: CalendarClock,
  tour_confirmed: CalendarCheck,
  tour_reschedule_proposed: CalendarClock,
  tour_reschedule_accepted: CalendarCheck,
  tour_declined: CalendarX,
  review_received: Star,
  saved_search_match: Home,
};

/** The message key per kind, in the `notifications` namespace. */
export const NOTIFICATION_SENTENCES: Record<NotificationKind, string> = {
  tour_requested: "kind.tourRequested",
  tour_confirmed: "kind.tourConfirmed",
  tour_reschedule_proposed: "kind.tourRescheduleProposed",
  tour_reschedule_accepted: "kind.tourRescheduleAccepted",
  tour_declined: "kind.tourDeclined",
  review_received: "kind.reviewReceived",
  saved_search_match: "kind.savedSearchMatch",
};

/** One icon per category, for the filter chips and the settings dialog. The
    generic bell stands for "everything", which no single kind's icon can. */
export const CATEGORY_ICONS: Record<NotificationCategory | "all", LucideIcon> = {
  all: Bell,
  tours: CalendarClock,
  matches: Home,
  activity: Star,
};
