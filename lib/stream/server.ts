import "server-only";
import { StreamChat } from "stream-chat";
import "./custom-data";

/* Server-side Stream client.

   STREAM_API_SECRET never leaves the server: this client mints user tokens
   (app/api/stream/token) and owns channel membership (lib/actions/tour-chat),
   which are the two things the browser must not be trusted with.

   getInstance() is the documented server-side pattern — a singleton is fine
   here (unlike on the client, where it breaks React strict mode). */
export function streamServerClient(): StreamChat {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error(
      "Stream credentials are missing — run `getstream env` to write NEXT_PUBLIC_STREAM_API_KEY and STREAM_API_SECRET."
    );
  }
  return StreamChat.getInstance(apiKey, apiSecret);
}
