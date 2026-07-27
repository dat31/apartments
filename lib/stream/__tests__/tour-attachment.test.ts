import { describe, expect, it } from "vitest";
import {
  buildTourAttachment,
  isTourAttachment,
  TOUR_ATTACHMENT_TYPE,
} from "@/lib/stream/tour-attachment";
import { makeTour } from "@/tests/factories";

describe("buildTourAttachment", () => {
  it("snapshots the tour's slot, status and ids", () => {
    const tour = makeTour({
      id: "tour-1",
      listingId: "listing-1",
      date: "2026-06-15",
      time: "10:00",
      status: "confirmed",
    });
    expect(buildTourAttachment(tour)).toEqual({
      type: TOUR_ATTACHMENT_TYPE,
      tour_id: "tour-1",
      listing_id: "listing-1",
      tour_date: "2026-06-15",
      tour_time: "10:00",
      tour_status: "confirmed",
    });
  });

  it("uses the proposed slot for a tour awaiting reschedule", () => {
    const attachment = buildTourAttachment(
      makeTour({
        date: "2026-06-15",
        time: "10:00",
        status: "reschedule",
        proposedDate: "2026-07-01",
        proposedTime: "15:00",
      })
    );
    expect(attachment.tour_date).toBe("2026-07-01");
    expect(attachment.tour_time).toBe("15:00");
  });

  it("includes a note when there is one", () => {
    expect(buildTourAttachment(makeTour({ note: "Bringing my partner" })).tour_note).toBe(
      "Bringing my partner"
    );
  });

  it("omits the note key entirely when it is blank or whitespace", () => {
    // An empty string would render an empty line in the card.
    expect(buildTourAttachment(makeTour({ note: "" }))).not.toHaveProperty("tour_note");
    expect(buildTourAttachment(makeTour({ note: "   " }))).not.toHaveProperty("tour_note");
  });

  it("trims the note", () => {
    expect(buildTourAttachment(makeTour({ note: "  hello  " })).tour_note).toBe("hello");
  });
});

describe("isTourAttachment", () => {
  it("accepts a payload built by buildTourAttachment", () => {
    expect(isTourAttachment(buildTourAttachment(makeTour()))).toBe(true);
  });

  it("rejects a differently typed attachment", () => {
    expect(isTourAttachment({ type: "image", tour_id: "x" })).toBe(false);
  });

  it("rejects a tour-typed payload with no usable id", () => {
    expect(isTourAttachment({ type: TOUR_ATTACHMENT_TYPE })).toBe(false);
    expect(isTourAttachment({ type: TOUR_ATTACHMENT_TYPE, tour_id: 42 })).toBe(false);
  });

  it("rejects non-objects without throwing", () => {
    // It sits in front of an SDK union, so it must survive anything.
    for (const value of [null, undefined, "tour", 0, [], true]) {
      expect(isTourAttachment(value)).toBe(false);
    }
  });
});
