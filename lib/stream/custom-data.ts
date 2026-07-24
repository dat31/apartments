import "stream-chat";
import type { DefaultChannelData } from "stream-chat-react";

/* Module augmentation for the custom fields this app stores on Stream
   records. Extending `DefaultChannelData` keeps the SDK's own `name`/`image`
   fields, which the prebuilt channel-list components read.

   Everything here is optional: Stream returns whatever was written at channel
   creation, and a tour thread carries no listing-only fields (and vice versa).

   ⚠️ `tour_date` / `tour_time` hold the tour's *effective* slot (`tourSlot`),
   not the original booking — a rescheduled tour would otherwise advertise the
   superseded slot while closing on the new one. */
declare module "stream-chat" {
  interface CustomChannelData extends DefaultChannelData {
    tour_id?: string;
    listing_id?: string;
    listing_title?: string;
    /* Cover image + monthly price power the thread header's listing chip
       without a per-thread listings query. Both are re-reconciled by the
       provisioning actions on every open, so an edited listing catches up. */
    listing_image?: string;
    listing_price?: number;
    tour_date?: string; // YYYY-MM-DD
    tour_time?: string; // HH:mm
  }

  interface CustomUserData {
    /** Index into PALETTE, so chat avatars match every other ProfileAvatar. */
    palette?: number;
    /** Mirrors lib/services/owners.ts: a real `profiles` row is "verified".
        Carried here so the conversation row can show the same check mark the
        listing's owner card does. */
    verified?: boolean;
  }
}
