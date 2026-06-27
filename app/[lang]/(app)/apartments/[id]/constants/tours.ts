/* ============================================================
   Tour scheduling — time/date helpers + per-owner availability.
   Mirrors the handoff prototype (tours.jsx) in real data.
   ============================================================ */
import type { TourRequest } from "@/schemas/tour";

export const TOUR_TIMES = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
] as const;

export const WD_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* How many months ahead the calendar lets you browse. */
export const MONTHS_AHEAD = 3;

/* ---------------- time / date helpers ---------------- */
export const tourTimeLabel = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ap = h < 12 ? "AM" : "PM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
};

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const todayYmd = () => ymd(new Date());

export const tourDateLong = (s: string) =>
  parseYmd(s).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

export const tourDateMed = (s: string) =>
  parseYmd(s).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export const isPastSlot = (dateStr: string, time: string) => {
  if (dateStr < todayYmd()) return true;
  if (dateStr > todayYmd()) return false;
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
};

/* ---------------- availability ---------------- */
/* Weekly template per owner: { weekdayIndex (0=Sun): times[] }. */
export type WeekTemplate = Record<number, readonly string[]>;

const week = (times: string[]): WeekTemplate => ({
  1: times,
  2: times,
  3: times,
  4: times,
  5: times,
});

export const AVAILABILITY: Record<string, WeekTemplate> = {
  you: {
    ...week(["10:00", "11:00", "13:00", "14:00", "15:00", "16:00"]),
    6: ["10:00", "11:00", "12:00"],
  },
  maya: {
    ...week(["09:00", "10:00", "11:00", "15:00", "16:00"]),
    0: ["11:00", "12:00"],
  },
  leo: week(["12:00", "13:00", "14:00", "15:00", "17:00"]),
};

export const availabilityFor = (ownerKey: string): WeekTemplate =>
  AVAILABILITY[ownerKey] ?? week(["10:00", "12:00", "14:00", "16:00"]);

/* ---------------- open-slot math ---------------- */
const slotKey = (date: string, time: string) => date + "|" + time;

/* Slots already taken by a pending/confirmed request for this owner. */
export function occupiedSet(tours: TourRequest[], ownerKey: string) {
  const s = new Set<string>();
  tours.forEach((t) => {
    if (t.ownerKey === ownerKey && t.status !== "declined")
      s.add(slotKey(t.date, t.time));
  });
  return s;
}

export function openSlotsFor(
  template: WeekTemplate,
  dateStr: string,
  occupied: Set<string>
) {
  const wd = parseYmd(dateStr).getDay();
  const times = template[wd] ?? [];
  return times.filter(
    (t) => !isPastSlot(dateStr, t) && !occupied.has(slotKey(dateStr, t))
  );
}

/* The effective date/time of a request — the proposed slot once the owner
   has suggested a new time, otherwise the renter's original pick. */
export const tourSlot = (t: TourRequest) =>
  t.status === "reschedule" && t.proposedDate && t.proposedTime
    ? { date: t.proposedDate, time: t.proposedTime }
    : { date: t.date, time: t.time };

/* ---------------- demo seed ----------------
   A few incoming requests for owner "you" so the dashboard's tour surface is
   populated on first visit. Dates are relative to today so they stay current. */
const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return ymd(d);
};

export function seedTours(): TourRequest[] {
  const now = Date.now();
  return [
    {
      id: "seed-t1",
      listingId: "l1",
      ownerKey: "you",
      date: addDays(2),
      time: "10:00",
      note: "Relocating for work next month — keen to see the afternoon light.",
      renterName: "Priya Nair",
      renterEmail: "priya.nair@example.com",
      status: "pending",
      createdAt: now - 1000 * 60 * 60 * 3,
    },
    {
      id: "seed-t2",
      listingId: "l2",
      ownerKey: "you",
      date: addDays(4),
      time: "14:00",
      note: "",
      renterName: "Marcus Webb",
      renterEmail: "m.webb@example.com",
      status: "pending",
      createdAt: now - 1000 * 60 * 60 * 8,
    },
    {
      id: "seed-t3",
      listingId: "l3",
      ownerKey: "you",
      date: addDays(1),
      time: "11:00",
      note: "Bringing my partner along, hope that's alright.",
      renterName: "Helena Cho",
      renterEmail: "helena.cho@example.com",
      status: "confirmed",
      createdAt: now - 1000 * 60 * 60 * 26,
    },
  ];
}
