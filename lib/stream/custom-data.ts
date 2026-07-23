/* Module augmentation for the custom fields we store on a tour channel.

   stream-chat types custom channel data through interface merging — without
   this declaration, passing `tour_id` / `listing_title` to client.channel()
   is a type error. Importing this file anywhere in the program applies the
   augmentation globally. */

import "stream-chat";

declare module "stream-chat" {
  interface CustomUserData {
    /* The profile's colour-block index, so a person is the same colour in a
       thread as in the account menu. Stream hands avatar overrides a display
       name and nothing else, so the value has to travel on the user record. */
    palette?: number;
  }

  interface CustomChannelData {
    /* The tour this thread belongs to — the channel's reason for existing. */
    tour_id?: string;
    /* Denormalised listing context so the thread header never needs a second
       fetch to answer "which apartment is this about?".

       The price and thumbnail are the design's listing chip: a snapshot taken
       when the thread was provisioned, not a live mirror of the row. A price
       that drifts after the fact is the lesser evil — the alternative is a
       listings read on every header render, for a chip whose job is to get you
       back to the listing, where the current figure is authoritative. */
    listing_id?: string;
    listing_title?: string;
    /* USD, the same unit `listings.price` stores; formatted per-locale at
       render time by useMoney(). */
    listing_price?: number;
    listing_image?: string;
    /* Fallback colour block for a listing with no photos, so the chip matches
       the app's own card treatment rather than showing an empty square. */
    listing_palette?: number;
    /* The tour's effective slot at provisioning time, for the header. */
    tour_date?: string;
    tour_time?: string;
  }
}
