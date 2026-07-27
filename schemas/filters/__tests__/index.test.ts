import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AVAIL_KEYS,
  AVAIL_MAX_DAYS,
  availCutoffISO,
  DEFAULT_FILTERS,
  filtersSchema,
} from "@/schemas/filters";

/* availCutoffISO reads the clock, so every case here freezes it. Without
   that these would pass today and fail in a month. */

describe("availCutoffISO", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns today for the 'now' horizon", () => {
    vi.setSystemTime(new Date("2026-06-15T09:00:00"));
    expect(availCutoffISO("now")).toBe("2026-06-15");
  });

  it("adds the horizon's day count", () => {
    vi.setSystemTime(new Date("2026-06-01T09:00:00"));
    expect(availCutoffISO("1w")).toBe("2026-06-08");
    expect(availCutoffISO("2w")).toBe("2026-06-15");
    expect(availCutoffISO("1m")).toBe("2026-07-02");
  });

  it("rolls over into the next month", () => {
    vi.setSystemTime(new Date("2026-06-28T09:00:00"));
    expect(availCutoffISO("1w")).toBe("2026-07-05");
  });

  it("rolls over into the next year", () => {
    vi.setSystemTime(new Date("2026-12-28T09:00:00"));
    expect(availCutoffISO("1w")).toBe("2027-01-04");
  });

  it("handles a leap day", () => {
    vi.setSystemTime(new Date("2028-02-28T09:00:00"));
    expect(availCutoffISO("now")).toBe("2028-02-28");
    expect(availCutoffISO("1w")).toBe("2028-03-06");
  });

  it("zero-pads month and day", () => {
    vi.setSystemTime(new Date("2026-01-02T09:00:00"));
    expect(availCutoffISO("now")).toBe("2026-01-02");
  });

  it("stays late in the day, when a naive UTC conversion would slip a date", () => {
    // Local 23:30 is already tomorrow in UTC; the function must use local parts.
    vi.setSystemTime(new Date("2026-06-15T23:30:00"));
    expect(availCutoffISO("now")).toBe("2026-06-15");
  });

  it("produces a cutoff for every horizon key", () => {
    vi.setSystemTime(new Date("2026-06-15T09:00:00"));
    for (const key of Object.keys(AVAIL_MAX_DAYS) as (keyof typeof AVAIL_MAX_DAYS)[]) {
      expect(availCutoffISO(key)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("AVAIL_MAX_DAYS", () => {
  it("covers every horizon except the unfiltered 'any'", () => {
    expect(Object.keys(AVAIL_MAX_DAYS).sort()).toEqual(
      AVAIL_KEYS.filter((k) => k !== "any").slice().sort()
    );
  });

  it("increases monotonically, which is what makes the horizons cumulative", () => {
    const values = AVAIL_KEYS.filter((k) => k !== "any").map(
      (k) => AVAIL_MAX_DAYS[k as keyof typeof AVAIL_MAX_DAYS]
    );
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
});

describe("filtersSchema", () => {
  it("accepts the default filters", () => {
    expect(filtersSchema.safeParse(DEFAULT_FILTERS).success).toBe(true);
  });

  it("rejects an availability value outside the known horizons", () => {
    expect(
      filtersSchema.safeParse({ ...DEFAULT_FILTERS, avail: "someday" }).success
    ).toBe(false);
  });

  it("rejects a non-array amenities value", () => {
    expect(
      filtersSchema.safeParse({ ...DEFAULT_FILTERS, amenities: "wifi" }).success
    ).toBe(false);
  });
});
