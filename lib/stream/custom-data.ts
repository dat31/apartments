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
       fetch to answer "which apartment is this about?". */
    listing_id?: string;
    listing_title?: string;
    /* The tour's effective slot at provisioning time, for the header. */
    tour_date?: string;
    tour_time?: string;
  }
}
