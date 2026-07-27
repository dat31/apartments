import { describe, expect, it } from "vitest";
import {
  googleCalUrl,
  icsContent,
  outlookCalUrl,
  tourEventTimes,
  type CalEvent,
} from "../calendar";
import { TOUR_DURATION_MIN } from "../route-plan";
import { makeTour } from "@/tests/factories";

/* Tour slots are Da Nang wall-clock times (UTC+7, no DST). The builders
   reinterpret those fields as ICT and emit a real UTC instant, so a device in
   any timezone produces the same calendar entry. */

const event = (overrides: Partial<CalEvent> = {}): CalEvent => {
  const start = new Date(2026, 5, 15, 10, 0, 0, 0); // 15 Jun 2026, 10:00 local
  return {
    start,
    end: new Date(start.getTime() + 30 * 60000),
    title: "Home tour",
    location: "Hải Châu, Da Nang",
    details: "See you there",
    ...overrides,
  };
};

describe("tourEventTimes", () => {
  it("starts at the tour's wall-clock slot", () => {
    const { start } = tourEventTimes(makeTour({ date: "2026-06-15", time: "14:30" }));
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(5);
    expect(start.getDate()).toBe(15);
    expect(start.getHours()).toBe(14);
    expect(start.getMinutes()).toBe(30);
  });

  it("runs for the assumed tour length", () => {
    const { start, end } = tourEventTimes(makeTour({ time: "09:00" }));
    expect(end.getTime() - start.getTime()).toBe(TOUR_DURATION_MIN * 60000);
  });

  it("rolls the end time into the next hour", () => {
    const { end } = tourEventTimes(makeTour({ date: "2026-06-15", time: "09:45" }));
    expect(end.getHours()).toBe(10);
    expect(end.getMinutes()).toBe(15);
  });

  it("zeroes seconds and milliseconds", () => {
    const { start } = tourEventTimes(makeTour({ time: "09:00" }));
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });
});

describe("googleCalUrl", () => {
  it("shifts the wall-clock slot by the Da Nang offset", () => {
    // 10:00 ICT is 03:00 UTC.
    const url = new URL(googleCalUrl(event()));
    expect(url.searchParams.get("dates")).toBe("20260615T030000Z/20260615T033000Z");
  });

  it("carries the template action and the localized fields", () => {
    const url = new URL(googleCalUrl(event()));
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Home tour");
    expect(url.searchParams.get("location")).toBe("Hải Châu, Da Nang");
    expect(url.searchParams.get("details")).toBe("See you there");
  });

  it("percent-encodes rather than emitting raw Vietnamese or spaces", () => {
    const raw = googleCalUrl(event({ title: "Xem nhà & ký hợp đồng" }));
    expect(raw).not.toContain(" ");
    expect(new URL(raw).searchParams.get("text")).toBe("Xem nhà & ký hợp đồng");
  });
});

describe("outlookCalUrl", () => {
  it("emits ISO-8601 UTC timestamps", () => {
    const url = new URL(outlookCalUrl(event()));
    expect(url.searchParams.get("startdt")).toBe("2026-06-15T03:00:00Z");
    expect(url.searchParams.get("enddt")).toBe("2026-06-15T03:30:00Z");
  });

  it("targets the compose deep link", () => {
    const url = new URL(outlookCalUrl(event()));
    expect(url.searchParams.get("path")).toBe("/calendar/action/compose");
    expect(url.searchParams.get("rru")).toBe("addevent");
    expect(url.searchParams.get("subject")).toBe("Home tour");
  });
});

describe("icsContent", () => {
  it("is a complete, well-formed VCALENDAR document", () => {
    const ics = icsContent(event());
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR")).toBe(true);
    for (const tag of ["VERSION:2.0", "BEGIN:VEVENT", "END:VEVENT", "BEGIN:VALARM"]) {
      expect(ics).toContain(tag);
    }
  });

  it("separates lines with CRLF, as RFC 5545 requires", () => {
    const ics = icsContent(event());
    expect(ics).toContain("\r\n");
    // No bare LF anywhere.
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("writes the start and end as UTC stamps", () => {
    const ics = icsContent(event());
    expect(ics).toContain("DTSTART:20260615T030000Z");
    expect(ics).toContain("DTEND:20260615T033000Z");
  });

  it("escapes commas, semicolons and backslashes in text fields", () => {
    const ics = icsContent(event({ location: "Hải Châu, Đà Nẵng; VN" }));
    expect(ics).toContain("Hải Châu\\, Đà Nẵng\\; VN");
  });

  it("escapes newlines into the literal \\n sequence", () => {
    const ics = icsContent(event({ details: "line one\nline two" }));
    expect(ics).toContain("line one\\nline two");
  });

  it("sets a one-hour display reminder", () => {
    const ics = icsContent(event());
    expect(ics).toContain("TRIGGER:-PT1H");
    expect(ics).toContain("ACTION:DISPLAY");
  });

  it("folds long lines to 75 octets or fewer", () => {
    const ics = icsContent(event({ details: "x".repeat(400) }));
    const encoder = new TextEncoder();
    for (const line of ics.split("\r\n")) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("folds on octet boundaries so multi-byte text survives", () => {
    // Each of these is 3 bytes; a naive character-count fold would overflow.
    const ics = icsContent(event({ details: "à".repeat(120) }));
    const encoder = new TextEncoder();
    for (const line of ics.split("\r\n")) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
    // And the text is still recoverable once continuations are unfolded.
    expect(ics.replace(/\r\n /g, "")).toContain("à".repeat(120));
  });

  it("gives the event a stable UID derived from its instant", () => {
    expect(icsContent(event())).toContain(
      `UID:tour-${Date.UTC(2026, 5, 15, 3, 0)}@danapa`
    );
  });
});
