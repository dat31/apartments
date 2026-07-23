import { StreamChat } from "stream-chat";
import type { TokenOrProvider } from "stream-chat";

/* One Stream connection, shared by every screen that opens a conversation and
   kept alive for a moment after the last one closes.

   The SDK's own `useCreateChatClient` is the obvious hook for this, and this
   file exists because of the single thing it does that a route change cannot
   survive: it disconnects the instant its component unmounts.
   `client.disconnectUser()` sets `disconnected` on every channel in
   `client.activeChannels`, and from then on any call that reaches
   `Channel.getClient()` throws

     You can't use a channel after client.disconnect() was called

   Leaving /messages does exactly that, with work still in the air:

   • <ChannelList>'s `queryChannels` response handler ends in
     `client.syncDeliveredCandidates(channels)`, which asks every returned
     channel for `getConfig()` — i.e. getClient() — to decide whether delivery
     receipts apply;
   • `channel.watch()` finishes the same way, on the channel it just fetched;
   • the delivery reporter flushes on a 1s `setTimeout` that `disconnectUser`
     does not clear.

   All three land a few hundred milliseconds after the page is gone, against
   channels the unmount has just killed.

   So the connection outlives any one screen. Consumers acquire and release it,
   and the disconnect is deferred until GRACE_MS after the *last* release:
   in-flight work settles against a live client, and a move from the inbox to a
   tour page reuses the socket instead of tearing one down and dialling another.
   Development-mode double-invoked effects stop churning the connection too,
   which is the property useCreateChatClient hand-rolls a guard for.

   Module state on purpose: this is the connection's lifetime, and the
   connection belongs to the tab, not to a component. */

/* Long enough to cover an in-flight query plus the delivery reporter's own
   1s buffer, short enough that a signed-in user who wanders off isn't holding
   a websocket open for no reason. */
const GRACE_MS = 5_000;

export type ChatClientHandle = {
  client: StreamChat;
  /* Resolves once connectUser has completed. Consumers must not touch the
     client before it does — Stream queues nothing for them. */
  ready: Promise<unknown>;
};

type Entry = ChatClientHandle & {
  /* apiKey + user id. A change here is a different connection, never a
     reusable one. */
  key: string;
  refs: number;
  teardown: ReturnType<typeof setTimeout> | null;
};

let current: Entry | null = null;

export function acquireChatClient({
  apiKey,
  userData,
  tokenProvider,
}: {
  apiKey: string;
  userData: { id: string; name: string };
  tokenProvider: TokenOrProvider;
}): ChatClientHandle {
  const key = `${apiKey}:${userData.id}`;

  /* A sign-out and sign-in as someone else inside the grace window: the held
     connection is another person's, so it goes now rather than on its timer. */
  if (current && current.key !== key) {
    const stale = current;
    current = null;
    if (stale.teardown) clearTimeout(stale.teardown);
    disconnect(stale);
  }

  if (current) {
    if (current.teardown) {
      clearTimeout(current.teardown);
      current.teardown = null;
    }
    current.refs += 1;
    return current;
  }

  const client = new StreamChat(apiKey);
  current = {
    client,
    key,
    ready: client.connectUser(userData, tokenProvider),
    refs: 1,
    teardown: null,
  };
  return current;
}

export function releaseChatClient(handle: ChatClientHandle) {
  /* Not the live entry — it was already superseded by another user's
     connection, which disconnected it on the way in. */
  if (current === null || current !== handle) return;

  const entry = current;
  entry.refs -= 1;
  if (entry.refs > 0) return;

  entry.teardown = setTimeout(() => {
    /* Re-checked rather than trusted: a consumer that mounted during the
       window cancels the timer, but a consumer that mounted and unmounted
       again leaves it armed with the count back at zero. */
    if (current !== entry || entry.refs > 0) return;
    current = null;
    disconnect(entry);
  }, GRACE_MS);
}

/* Waits out the connect either way. Disconnecting mid-handshake leaves the
   socket open, and a connect that failed still has one to close. */
function disconnect(entry: Entry) {
  entry.ready
    .catch(() => {})
    .then(() => entry.client.disconnectUser())
    .catch(() => {});
}
