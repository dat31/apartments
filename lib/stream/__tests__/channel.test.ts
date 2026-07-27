import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHANNEL_TYPE,
  isThreadClosed,
  STREAM_TOKEN_TTL_SECONDS,
  THREAD_GRACE_DAYS,
  threadClosesOn,
  tourChannelId,
} from "@/lib/stream/channel";
import { makeTour } from "@/tests/factories";

/* isThreadClosed reads the Da Nang clock, so every case freezes time. The
   helper is timezone-independent by construction (it shifts to ICT itself),
   so these assertions hold on any machine. */

describe("tourChannelId", () => {
  it("prefixes the tour id", () => {
    expect(tourChannelId("abc")).toBe("tour-abc");
  });

  it("stays inside Stream's 64-character channel-id limit for a uuid", () => {
    const id = tourChannelId("11111111-2222-4333-8444-555555555555");
    expect(id.length).toBeLessThanOrEqual(64);
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("threadClosesOn", () => {
  it("adds the grace period to the tour date", () => {
    expect(threadClosesOn(makeTour({ date: "2026-06-15" }))).toBe("2026-06-22");
    expect(THREAD_GRACE_DAYS).toBe(7);
  });

  it("rolls over a month boundary", () => {
    expect(threadClosesOn(makeTour({ date: "2026-06-28" }))).toBe("2026-07-05");
  });

  it("rolls over a year boundary", () => {
    expect(threadClosesOn(makeTour({ date: "2026-12-28" }))).toBe("2027-01-04");
  });

  it("keys off the proposed slot once a reschedule is pending", () => {
    // A reschedule moves the deadline; keying off the superseded date would
    // close the thread while the two sides are still negotiating.
    const tour = makeTour({
      date: "2026-06-15",
      status: "reschedule",
      proposedDate: "2026-07-01",
      proposedTime: "10:00",
    });
    expect(threadClosesOn(tour)).toBe("2026-07-08");
  });

  it("ignores a proposed date on a tour that is not in reschedule", () => {
    const tour = makeTour({
      date: "2026-06-15",
      status: "confirmed",
      proposedDate: "2026-07-01",
      proposedTime: "10:00",
    });
    expect(threadClosesOn(tour)).toBe("2026-06-22");
  });
});

describe("isThreadClosed", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("closes a declined tour immediately, however far off its date", () => {
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
    expect(isThreadClosed(makeTour({ date: "2026-12-01", status: "declined" }))).toBe(true);
  });

  it("stays open before the tour", () => {
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
    expect(isThreadClosed(makeTour({ date: "2026-06-20" }))).toBe(false);
  });

  it("stays open through the whole grace period", () => {
    vi.setSystemTime(new Date("2026-06-22T12:00:00Z"));
    // The tour was on the 15th; the 22nd is the last writable day.
    expect(isThreadClosed(makeTour({ date: "2026-06-15" }))).toBe(false);
  });

  it("closes the day after the grace period runs out", () => {
    vi.setSystemTime(new Date("2026-06-23T12:00:00Z"));
    expect(isThreadClosed(makeTour({ date: "2026-06-15" }))).toBe(true);
  });
});

describe("constants", () => {
  it("uses Stream's built-in messaging channel type", () => {
    expect(CHANNEL_TYPE).toBe("messaging");
  });

  it("gives chat tokens a bounded lifetime", () => {
    expect(STREAM_TOKEN_TTL_SECONDS).toBeGreaterThan(0);
    expect(STREAM_TOKEN_TTL_SECONDS).toBeLessThanOrEqual(24 * 60 * 60);
  });
});
