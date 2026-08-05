import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type NotificationItem } from "@/schemas/notification";
import {
  countByFilter,
  dayBucket,
  filterNotifications,
  groupByDay,
  parseFeedFilter,
} from "../feed";

/* A frozen clock, because every heading in this module is relative to one
   (AGENTS.md). 14:00 local on a Wednesday, so "yesterday" and "the day
   before" are both inside the same week and neither straddles a month. */
const NOW = new Date(2026, 7, 5, 14, 0, 0);

/* Local rather than from tests/factories: notifications have no shared
   factory, and the same shape is built inline in lib/notifications/__tests__. */
function makeItem(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: "n1",
    kind: "tour_confirmed",
    actor: { id: "actor", name: "Maya", palette: 1 },
    listingId: "listing-1",
    tourId: "tour-1",
    savedSearchId: null,
    data: {},
    read: false,
    createdAt: new Date(2026, 7, 5, 9, 0, 0).toISOString(),
    listing: null,
    tourRole: "renter",
    tourStatus: "confirmed",
    ...overrides,
  };
}

/** An item created `hours` before the frozen NOW. */
const at = (hours: number, overrides: Partial<NotificationItem> = {}) =>
  makeItem({
    id: `n-${hours}`,
    createdAt: new Date(NOW.getTime() - hours * 3_600_000).toISOString(),
    ...overrides,
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("parseFeedFilter", () => {
  it("accepts the filters the chips can produce", () => {
    expect(parseFeedFilter("unread")).toBe("unread");
    expect(parseFeedFilter("tours")).toBe("tours");
  });

  it("falls back to the whole feed for anything else", () => {
    // A stale link or a hand-typed parameter should show everything, never an
    // empty page that looks like there is no news.
    expect(parseFeedFilter(null)).toBe("all");
    expect(parseFeedFilter("")).toBe("all");
    expect(parseFeedFilter("messages")).toBe("all");
  });
});

describe("filterNotifications", () => {
  const items = [
    makeItem({ id: "a", kind: "tour_requested", read: false }),
    makeItem({ id: "b", kind: "saved_search_match", read: true, tourId: null }),
    makeItem({ id: "c", kind: "review_received", read: true, tourId: null }),
  ];

  it("keeps everything under 'all'", () => {
    expect(filterNotifications(items, "all")).toHaveLength(3);
  });

  it("keeps only unread under 'unread'", () => {
    expect(filterNotifications(items, "unread").map((n) => n.id)).toEqual(["a"]);
  });

  it("groups kinds by category, not one chip per kind", () => {
    // The point of categories: a renter filtering "viewings" wants requests,
    // confirmations and cancellations together.
    const tours = [
      makeItem({ id: "t1", kind: "tour_requested" }),
      makeItem({ id: "t2", kind: "tour_declined" }),
      makeItem({ id: "m1", kind: "saved_search_match" }),
    ];
    expect(filterNotifications(tours, "tours").map((n) => n.id)).toEqual([
      "t1",
      "t2",
    ]);
    expect(filterNotifications(tours, "matches").map((n) => n.id)).toEqual([
      "m1",
    ]);
  });
});

describe("countByFilter", () => {
  it("counts every chip in one pass", () => {
    const counts = countByFilter([
      makeItem({ id: "a", kind: "tour_requested", read: false }),
      makeItem({ id: "b", kind: "tour_confirmed", read: true }),
      makeItem({ id: "c", kind: "saved_search_match", read: false }),
    ]);
    expect(counts.all).toBe(3);
    expect(counts.unread).toBe(2);
    expect(counts.tours).toBe(2);
    expect(counts.matches).toBe(1);
    expect(counts.activity).toBe(0);
  });
});

describe("dayBucket", () => {
  it("reads calendar days, not elapsed hours", () => {
    /* The case that makes this worth a function: 23:00 the previous night is
       fifteen hours ago but belongs under "Yesterday", and 00:30 this morning
       is thirteen hours ago and belongs under "Today". */
    const lastNight = new Date(2026, 7, 4, 23, 0, 0).toISOString();
    const earlyToday = new Date(2026, 7, 5, 0, 30, 0).toISOString();
    expect(dayBucket(lastNight, NOW)).toBe("yesterday");
    expect(dayBucket(earlyToday, NOW)).toBe("today");
  });

  it("splits the rest into this week and earlier", () => {
    expect(dayBucket(new Date(2026, 7, 1).toISOString(), NOW)).toBe("thisWeek");
    // Seven days back is the first day that is no longer "this week".
    expect(dayBucket(new Date(2026, 6, 29).toISOString(), NOW)).toBe("earlier");
    expect(dayBucket(new Date(2026, 5, 1).toISOString(), NOW)).toBe("earlier");
  });

  it("treats a clock-skewed future timestamp as today", () => {
    const soon = new Date(NOW.getTime() + 60_000).toISOString();
    expect(dayBucket(soon, NOW)).toBe("today");
  });
});

describe("groupByDay", () => {
  it("splits a sorted feed into consecutive sections", () => {
    const sections = groupByDay(
      [at(1), at(3), at(20), at(30), at(24 * 5)],
      NOW
    );
    expect(sections.map((s) => s.bucket)).toEqual([
      "today",
      "yesterday",
      "thisWeek",
    ]);
    // 1h and 3h ago are today; 20h and 30h ago both land on yesterday.
    expect(sections[0].items).toHaveLength(2);
    expect(sections[1].items).toHaveLength(2);
    expect(sections[2].items).toHaveLength(1);
  });

  it("keeps an out-of-order item beside its neighbours", () => {
    /* Sections follow the list rather than bucketing it, so a row that
       arrives out of order does not jump to a group at the top of the page. */
    const sections = groupByDay([at(1), at(30), at(2)], NOW);
    expect(sections.map((s) => s.bucket)).toEqual([
      "today",
      "yesterday",
      "today",
    ]);
  });

  it("returns nothing for an empty feed", () => {
    expect(groupByDay([], NOW)).toEqual([]);
  });
});
