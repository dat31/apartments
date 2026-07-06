import type { Tables, TablesInsert } from "@/lib/database.types";
import type { WeekTemplate } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";

/* Pure mapping between `owner_availability` rows and the app's WeekTemplate,
   split out so it runs in the browser (both the renter booking dialog and the
   owner editor read/write availability straight from the client Supabase
   client). No `server-only`, no cache, no React.

   One row = one available (weekday, time) slot. weekday is 0=Sun..6=Sat to
   match the app's WeekTemplate keys and JS Date#getDay. */

type AvailabilityRow = Tables<"owner_availability">;

/* Postgres `time` comes back as "HH:mm:ss"; the app works in "HH:mm". */
const hhmm = (t: string): string => t.slice(0, 5);

/** Group availability rows into a WeekTemplate (weekday → sorted times). */
export function toWeekTemplate(rows: AvailabilityRow[]): WeekTemplate {
  const tpl: Record<number, string[]> = {};
  for (const r of rows) (tpl[r.weekday] ??= []).push(hhmm(r.time));
  for (const wd of Object.keys(tpl)) tpl[Number(wd)].sort();
  return tpl;
}

/** Flatten a WeekTemplate into insertable rows for one owner. */
export function toAvailabilityRows(
  ownerId: string,
  template: WeekTemplate
): TablesInsert<"owner_availability">[] {
  const rows: TablesInsert<"owner_availability">[] = [];
  for (const [wd, times] of Object.entries(template))
    for (const time of times ?? [])
      rows.push({ owner_id: ownerId, weekday: Number(wd), time });
  return rows;
}
