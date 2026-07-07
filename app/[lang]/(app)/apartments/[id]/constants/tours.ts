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

/* How many months ahead the calendar lets you browse. */
export const MONTHS_AHEAD = 3;

/* ---------------- time / date helpers ----------------
   Display-formatting of tour dates/times is done at the call sites with
   next-intl's useFormatter (locale-aware); the helpers below are the
   locale-agnostic ymd plumbing the scheduling logic relies on. */
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const todayYmd = () => ymd(new Date());

export const isPastSlot = (dateStr: string, time: string) => {
  if (dateStr < todayYmd()) return true;
  if (dateStr > todayYmd()) return false;
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
};

/* ---------------- availability ---------------- */
/* Weekly template per owner: { weekdayIndex (0=Sun): times[] }. Owners set this
   from the dashboard; it's persisted per owner in `owner_availability` and read
   via use-availability. */
export type WeekTemplate = Record<number, readonly string[]>;

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
