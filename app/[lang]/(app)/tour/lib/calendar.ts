import { parseYmd } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { TOUR_DURATION_MIN } from "./route-plan";
import type { TourRequest } from "@/schemas/tour";

/* ============================================================
   Add-to-calendar artifacts for a confirmed tour (improvement #5).
   Pure module — no React, no DOM. Builds the Google/Outlook
   template URLs and the .ics body from a localized CalEvent so
   every mainstream calendar works with zero auth or server work.
   ============================================================ */

/** A calendar event, ready to hand to any of the URL/ICS builders.
    Title/location/details are already localized by the caller. start/end
    carry the tour's Da Nang wall-clock fields (see tourEventTimes). */
export type CalEvent = {
  start: Date;
  end: Date;
  title: string;
  location: string;
  details: string;
};

/** Start/end for a tour: its wall-clock slot, running TOUR_DURATION_MIN —
    the same viewing length the route planner assumes for gap math. The
    fields are read back locally (getHours…) so they always reflect the
    tour's stored wall-clock time regardless of the device's own zone. */
export function tourEventTimes(tour: TourRequest): { start: Date; end: Date } {
  const [h, m] = tour.time.split(":").map(Number);
  const start = parseYmd(tour.date);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + TOUR_DURATION_MIN * 60000);
  return { start, end };
}

/* Da Nang / Indochina Time is a fixed UTC+07:00 (no DST), so a tour's stored
   wall-clock date+time pins to a single UTC instant we can hand to every
   calendar unambiguously — no VTIMEZONE, and correct on any device timezone.
   Passing naive local times to Google/Outlook/.ics would otherwise be read as
   UTC (or the importer's own zone), shifting the event by the offset. */
const DA_NANG_OFFSET_MIN = 7 * 60;

const p2 = (n: number) => String(n).padStart(2, "0");

/* Reinterpret a Date's wall-clock fields as Da Nang time → the real UTC
   instant of the tour. */
const wallClockToInstant = (d: Date) =>
  new Date(
    Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes()
    ) -
      DA_NANG_OFFSET_MIN * 60000
  );

/* A real instant → iCalendar UTC stamp YYYYMMDDTHHMMSSZ. */
const utcStamp = (d: Date) =>
  `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(
    d.getUTCHours()
  )}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}Z`;

/* A real instant → ISO-8601 UTC (no milliseconds), for the Outlook deep link. */
const isoUtc = (d: Date) =>
  `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T${p2(
    d.getUTCHours()
  )}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}Z`;

/** calendar.google.com template link — a pure URL, no API. */
export function googleCalUrl(ev: CalEvent): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${utcStamp(wallClockToInstant(ev.start))}/${utcStamp(
      wallClockToInstant(ev.end)
    )}`,
    location: ev.location,
    details: ev.details,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Outlook.com compose deep link. */
export function outlookCalUrl(ev: CalEvent): string {
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: ev.title,
    location: ev.location,
    body: ev.details,
    startdt: isoUtc(wallClockToInstant(ev.start)),
    enddt: isoUtc(wallClockToInstant(ev.end)),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}

/* Escape a value for an iCalendar text field (RFC 5545 §3.3.11). */
const icsEscape = (s: string) =>
  String(s)
    .replace(/([,;\\])/g, "\\$1")
    .replace(/\n/g, "\\n");

/* Fold a content line to ≤75 octets per physical line (RFC 5545 §3.1),
   splitting on octet — not character — boundaries so multi-byte Vietnamese
   text and long URLs survive strict parsers. Continuation lines begin with a
   space, which counts toward the limit, so they cap one octet lower. */
const foldIcsLine = (line: string): string => {
  const enc = new TextEncoder();
  const chunks: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = chunks.length === 0 ? 75 : 74;
    if (bytes + n > limit) {
      chunks.push(cur);
      cur = ch;
      bytes = n;
    } else {
      cur += ch;
      bytes += n;
    }
  }
  chunks.push(cur);
  return chunks.join("\r\n ");
};

/** A complete .ics document for Apple Calendar / Outlook desktop / anything
    else, with a one-hour display reminder. */
export function icsContent(ev: CalEvent): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Danapa//Home tour//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:tour-${wallClockToInstant(ev.start).getTime()}@danapa`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(wallClockToInstant(ev.start))}`,
    `DTEND:${utcStamp(wallClockToInstant(ev.end))}`,
    `SUMMARY:${icsEscape(ev.title)}`,
    `LOCATION:${icsEscape(ev.location)}`,
    `DESCRIPTION:${icsEscape(ev.details)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(ev.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(foldIcsLine)
    .join("\r\n");
}
