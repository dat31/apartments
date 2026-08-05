import type { Tables } from "@/lib/database.types";
import {
  notificationDataSchema,
  type Notification,
  type NotificationKind,
} from "@/schemas/notification";

/* Pure row → domain mapping for `notifications`. No `server-only`, no cache,
   no React — same contract as tours-map, so the browser can reuse it if a
   client-side path ever needs it. */

type NotificationRow = Tables<"notifications"> & {
  actor?: Pick<Tables<"profiles">, "id" | "name" | "palette"> | null;
};

export function toNotification(row: NotificationRow): Notification {
  /* `data` is jsonb, so Postgres will hand back whatever was written — parse
     rather than cast. A row whose payload doesn't fit becomes an empty
     payload, which renders a sentence missing its slot rather than throwing
     inside a list. */
  const parsed = notificationDataSchema.safeParse(row.data ?? {});

  return {
    id: row.id,
    kind: row.kind as NotificationKind,
    actor: row.actor
      ? { id: row.actor.id, name: row.actor.name, palette: row.actor.palette }
      : null,
    listingId: row.listing_id,
    tourId: row.tour_id,
    savedSearchId: row.saved_search_id,
    data: parsed.success ? parsed.data : {},
    // The column stores *when* it was read; the UI only ever asks whether.
    read: row.read_at !== null,
    createdAt: row.created_at,
  };
}
