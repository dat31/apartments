import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_KIND_CATEGORY,
  type NotificationItem,
} from "@/schemas/notification";

/* ============================================================
   The feed's own arithmetic: which rows a filter shows, and
   which day heading each one falls under.

   Pure and React-free, for the usual reason — this is the part
   with edge cases (a notification from 23:59 last night is
   "Yesterday", not "17 hours ago"), and edge cases want a test
   with a frozen clock rather than a browser.
   ============================================================ */

/** The chips above the feed: the two states, then one per category. */
export const FEED_FILTERS = ["all", "unread", ...NOTIFICATION_CATEGORIES] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];

/** Read `?show=` off the URL. Anything unrecognised — a stale link, a typo, a
    category that no longer exists — falls back to the whole feed rather than
    to an empty one. */
export function parseFeedFilter(value: string | null | undefined): FeedFilter {
  return FEED_FILTERS.includes(value as FeedFilter)
    ? (value as FeedFilter)
    : "all";
}

export function matchesFilter(n: NotificationItem, filter: FeedFilter): boolean {
  if (filter === "all") return true;
  if (filter === "unread") return !n.read;
  return NOTIFICATION_KIND_CATEGORY[n.kind] === filter;
}

export function filterNotifications(
  items: NotificationItem[],
  filter: FeedFilter
): NotificationItem[] {
  return items.filter((n) => matchesFilter(n, filter));
}

/** How many rows each chip would show. Computed in one pass over the feed so
    the chip row costs the same whatever the filter is. */
export function countByFilter(
  items: NotificationItem[]
): Record<FeedFilter, number> {
  const counts = Object.fromEntries(FEED_FILTERS.map((f) => [f, 0])) as Record<
    FeedFilter,
    number
  >;
  for (const n of items) {
    counts.all += 1;
    if (!n.read) counts.unread += 1;
    counts[NOTIFICATION_KIND_CATEGORY[n.kind]] += 1;
  }
  return counts;
}

/* ---- Day headings ---- */

export const DAY_BUCKETS = ["today", "yesterday", "thisWeek", "earlier"] as const;
export type DayBucket = (typeof DAY_BUCKETS)[number];

export type DaySection = { bucket: DayBucket; items: NotificationItem[] };

/** Whole days between two instants, by calendar date rather than by elapsed
    hours: 23:00 and 01:00 are a day apart even though two hours passed. Both
    dates are read in the runtime's zone, which is the reader's — a heading
    saying "Today" has to mean their today. */
function calendarDaysBetween(from: Date, to: Date): number {
  const strip = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((strip(to) - strip(from)) / 86_400_000);
}

export function dayBucket(createdAt: string, now: Date): DayBucket {
  const days = calendarDaysBetween(new Date(createdAt), now);
  // Negative means the future, which a clock skew of a few seconds can
  // produce. It is still today's news.
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return "thisWeek";
  return "earlier";
}

/**
 * Split the feed into consecutive day sections.
 *
 * Takes the list in the order it is given (the server returns newest first)
 * and starts a new section whenever the heading changes, rather than bucketing
 * into four fixed groups. The two are the same thing for a sorted feed, and
 * this way an out-of-order item lands beside its neighbours instead of jumping
 * to a group at the top of the page.
 */
export function groupByDay(
  items: NotificationItem[],
  now: Date
): DaySection[] {
  const sections: DaySection[] = [];
  for (const n of items) {
    const bucket = dayBucket(n.createdAt, now);
    const last = sections[sections.length - 1];
    if (last && last.bucket === bucket) last.items.push(n);
    else sections.push({ bucket, items: [n] });
  }
  return sections;
}
