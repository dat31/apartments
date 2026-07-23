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

/* The instance is deliberately split from the connection.

   `new StreamChat(key)` opens nothing — it is a plain object until
   connectUser dials — so it can be handed to <Chat> on the very first render,
   before the token request has even started. That matters structurally:
   mounting <Chat> later means swapping the element at that position, and React
   answers a swap by unmounting the entire subtree under it. Every consumer
   below — the inbox, the tour cards, any open thread — would be destroyed and
   rebuilt, re-running channel watches and flashing their skeletons back on.
   One instance from the first paint is what keeps that tree still. */
let instance: { apiKey: string; client: StreamChat } | null = null;

export function getChatClient(apiKey: string): StreamChat {
  if (instance?.apiKey === apiKey) return instance.client;
  instance = { apiKey, client: new StreamChat(apiKey) };
  return instance.client;
}

export type ChatConnection = {
  client: StreamChat;
  /* Resolves once connectUser has completed. Consumers must not touch the
     client before it does — Stream queues nothing for them. */
  ready: Promise<unknown>;
};

type Entry = ChatConnection & {
  /* Whose connection this is. A change here is a different connection, never
     a reusable one. */
  userId: string;
  refs: number;
  teardown: ReturnType<typeof setTimeout> | null;
};

let current: Entry | null = null;

/* connectUser and disconnectUser now run against the *same* instance, so they
   have to be kept in order: a sign-out and sign-in as someone else would
   otherwise dial the new session while the old one's teardown is still in
   flight, and the socket that wins is whichever settles last. */
let queue: Promise<unknown> = Promise.resolve();

function serialize<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work, work);
  queue = next.catch(() => undefined);
  return next;
}

export function acquireChatConnection({
  client,
  userData,
  tokenProvider,
}: {
  client: StreamChat;
  userData: { id: string; name: string };
  tokenProvider: TokenOrProvider;
}): ChatConnection {
  /* A sign-out and sign-in as someone else inside the grace window: the held
     connection is another person's, so it goes now rather than on its timer. */
  if (current && current.userId !== userData.id) {
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

  current = {
    client,
    userId: userData.id,
    ready: serialize(() => client.connectUser(userData, tokenProvider)),
    refs: 1,
    teardown: null,
  };
  return current;
}

export function releaseChatConnection(handle: ChatConnection) {
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
    .then(() => serialize(() => entry.client.disconnectUser()))
    .catch(() => {});
}
