"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { Chat, WithComponents } from "stream-chat-react";
import type { StreamChat } from "stream-chat";
import type { Locale } from "@/i18n/routing";
import { useUser } from "@/hooks/auth";
import {
  acquireChatConnection,
  getChatClient,
  releaseChatConnection,
} from "@/lib/stream/client";
import { streamI18n } from "@/lib/stream/i18n";
import { messagingComponents } from "./stream-components";
import "@/lib/stream/custom-data";

/* Stream's stylesheet first, then the token bridge that re-points it at the
   app's palette — see stream-theme.css. */
import "stream-chat-react/css/index.css";
import "./stream-theme.css";

/* Mounts one Stream Chat connection for a page that shows conversations.

   The client is deliberately long-lived and hoisted here rather than created
   per thread: several threads can be open at once, and a per-thread client
   would disconnect its siblings on unmount. Individual threads only swap the
   `channel` prop on <Channel>.

   Pages that never show a thread don't mount this, so browsing the app costs
   no websocket — <Chat> below is mounted from the first render, but the
   websocket is dialled by acquireChatConnection, which `enabled` gates.

   The one structural rule here: `children` must sit at the same place in the
   tree on every render. React reconciles by position and type, so wrapping
   them in <Chat> *later* — once a token arrives, once the socket connects —
   reads as a different element at that slot and unmounts everything below it.
   That is a full remount of the page's content, twice, a second after it
   first painted: channel watches re-run and every thread drops back to its
   skeleton. Hence one invariant tree, with the async parts expressed as
   context values rather than as changes in shape. */

type Credentials = {
  chatToken: string;
  apiKey: string;
  userId: string;
  name: string;
};

type MessagingState = {
  /* False while the token is in flight or the socket is connecting — threads
     render a skeleton rather than an error in that window. Gating on a context
     value rather than on whether <Chat> is mounted is what lets the tree stay
     the same shape throughout; see the note above. */
  ready: boolean;
  /* True once the token request has given up. Distinct from `!ready`: this is
     terminal, so consumers show an error instead of a skeleton forever. */
  failed: boolean;
  /* Unread count per tour id, for the tour card badges. */
  unreadByTour: Record<string, number>;
  /* Unread across every conversation, for the header badge. */
  totalUnread: number;
};

async function fetchCredentials(): Promise<Credentials> {
  const res = await fetch("/api/stream/token");
  if (!res.ok) throw new Error("Could not obtain a Stream token");
  return res.json();
}

const IDLE: MessagingState = {
  ready: false,
  failed: false,
  unreadByTour: {},
  totalUnread: 0,
};

const MessagingContext = React.createContext<MessagingState>(IDLE);

export const useMessaging = () => React.useContext(MessagingContext);

/* Inlined at build time, so this is a constant for the lifetime of the bundle
   rather than something that can arrive late. The token route hands the same
   value back, but waiting for it would mean mounting <Chat> late — which is
   the remount this file exists to avoid. */
const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;

export function MessagingProvider({
  children,
  /* Lets a page skip the connection entirely when it has nothing to show
     (e.g. a renter with no tours yet) — no token request, no websocket.
     <Chat> is still mounted; it costs nothing until connectUser dials. */
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const { data: user } = useUser();
  const { resolvedTheme } = useTheme();
  const locale = useLocale() as Locale;

  /* Keyed on the user id so a sign-out or account switch can never reuse the
     previous person's credentials. The token inside expires (see
     STREAM_TOKEN_TTL_SECONDS); refreshing it is the token provider's job
     below, not this query's, so the cache time here only governs the
     userId / name that come alongside it. */
  const { data: credentials, isError } = useQuery({
    queryKey: ["stream", "token", user?.id],
    enabled: enabled && Boolean(user?.id),
    staleTime: 50 * 60 * 1000,
    queryFn: fetchCredentials,
  });

  /* Instantiation, connectUser and cleanup belong to lib/stream/client.ts —
     never call connectUser/disconnectUser from a component. It is a shared,
     ref-counted connection rather than the SDK's useCreateChatClient because
     that hook disconnects on unmount, and a route change away from a thread
     leaves requests in flight that then touch a dead channel; the file says
     more. */
  const client = React.useMemo(
    () => (API_KEY ? getChatClient(API_KEY) : null),
    []
  );

  const connected = useChatConnection(client, credentials);

  useNoAttachments(client);
  const { unreadByTour, totalUnread } = useUnread(client, connected);

  const value = React.useMemo(
    () => ({
      ready: connected,
      /* Without this the query's error state is invisible: `ready` would stay
         false forever and every consumer would sit on a skeleton with no way
         to tell "still connecting" from "this is never going to connect". */
      failed: isError,
      unreadByTour,
      totalUnread,
    }),
    [connected, isError, unreadByTour, totalUnread]
  );

  /* Only reachable with the env var unset, i.e. never at runtime for a given
     build — so this branch cannot swap under a mounted tree. */
  if (!client) {
    return (
      <MessagingContext.Provider value={value}>
        {children}
      </MessagingContext.Provider>
    );
  }

  return (
    <MessagingContext.Provider value={value}>
      <Chat
        client={client}
        i18nInstance={streamI18n(locale)}
        theme={
          resolvedTheme === "dark"
            ? "str-chat__theme-dark"
            : "str-chat__theme-light"
        }
      >
        {/* Registered above every consumer rather than per screen: the inbox
            and the tour cards' inline threads render the same design. */}
        <WithComponents overrides={messagingComponents}>
          {children}
        </WithComponents>
      </Chat>
    </MessagingContext.Provider>
  );
}

/* Borrows the shared connection for as long as this provider is mounted, and
   reports whether it is up.

   False until connectUser resolves, which is what `ready` downstream reports:
   the SDK queues nothing for a client that hasn't finished connecting, so
   letting a thread render early would query against a socket that isn't there
   yet. Releasing does not disconnect — see lib/stream/client.ts. */
function useChatConnection(
  client: StreamChat | null,
  credentials: Credentials | undefined
): boolean {
  const [connected, setConnected] = React.useState(false);

  const userId = credentials?.userId;
  const name = credentials?.name;
  const userData = React.useMemo(
    () => (userId ? { id: userId, name: name ?? "" } : null),
    [userId, name]
  );

  /* A provider rather than the token string: tokens expire, and a fixed string
     would leave the SDK unable to reconnect once it lapses. Identity still
     comes from the session cookie on every call, so this cannot mint a token
     for anyone but the signed-in user.

     The first call spends the token the query above already fetched — going to
     the network for it again would re-run the auth check, the profile read and
     the user upsert for no gain. Every later call is a genuine refresh. */
  const unspentToken = React.useRef<string | null>(null);
  const armedToken = React.useRef<string | null>(null);

  /* Declared before the connect effect so the token is in hand by the time
     that one runs: effects in a commit fire in declaration order. Armed once
     per distinct token, so a refetch that returns the same string doesn't
     re-offer one that has already been spent. */
  React.useEffect(() => {
    const token = credentials?.chatToken;
    if (!token || armedToken.current === token) return;
    armedToken.current = token;
    unspentToken.current = token;
  }, [credentials?.chatToken]);

  const tokenProvider = React.useCallback(async () => {
    const cached = unspentToken.current;
    if (cached) {
      unspentToken.current = null;
      return cached;
    }
    return (await fetchCredentials()).chatToken;
  }, []);

  React.useEffect(() => {
    if (!client || !userData) return;
    let live = true;
    const handle = acquireChatConnection({ client, userData, tokenProvider });

    /* Already resolved when the connection is being reused, so this is a
       microtask rather than a round trip — no skeleton flash on the way back
       into the inbox. */
    handle.ready
      .then(() => {
        if (live) setConnected(true);
      })
      .catch(() => {
        /* Leaves `ready` false. The token query's own error state is what
           turns a stalled connection into a message the user can read. */
      });

    return () => {
      live = false;
      setConnected(false);
      releaseChatConnection(handle);
    };
  }, [client, userData, tokenProvider]);

  return connected;
}

/* Turns file uploads off for every composer this client builds.

   Conversations here are about an apartment, not an exchange of files, and
   nothing in the app moderates what gets uploaded. Hiding the attachment
   button is not enough on its own: MessageComposerUI wraps itself in
   <WithDragAndDropUpload> regardless of which AttachmentSelector is
   registered, and the textarea's paste handler feeds the same uploader — so
   with only the button removed a dragged or pasted image still uploads and
   sends. Zero upload slots is what the SDK actually gates on (dropzone,
   paste and the selector all read it), so this is the switch that closes all
   three doors at once.

   Registered through the client's composer setup hook rather than per
   <Channel>: every MessageComposer subscribes to it, including ones created
   before this effect runs. */
function useNoAttachments(client: StreamChat | null) {
  React.useEffect(() => {
    if (!client) return;
    client.setMessageComposerSetupFunction(({ composer }) => {
      composer.updateConfig({ attachments: { maxNumberOfFilesPerMessage: 0 } });
    });
    return () => client.setMessageComposerSetupFunction(null);
  }, [client]);
}

/* Per-conversation unread counts, keyed by channel id.

   Seeded from client.getUnreadCount() — one request that covers *every*
   conversation the user is in. The obvious alternative, querying channels with
   `watch: true` and reading countUnread(), is worse twice over: a channel query
   is capped at 30 per page, so anyone past 30 conversations silently loses
   badges on the rest; and the watches it opens are shared, mutable state that
   any component calling stopWatching() on the same cached Channel object can
   tear down underneath this.

   Live updates come from events instead of watches. `notification.message_new`
   is delivered for member channels the user is *not* watching, which is exactly
   this case, so nothing has to be watched for the counts to stay current. */
const TOUR_PREFIX = "tour-";

/* Events carry a bare `channel_id`; getUnreadCount returns a cid on some
   deployments. One shape in, bare id out. */
const bareChannelId = (value: string) =>
  value.includes(":") ? value.slice(value.lastIndexOf(":") + 1) : value;

function useUnread(client: StreamChat | null, connected: boolean) {
  const [unreadById, setUnreadById] = React.useState<Record<string, number>>({});

  /* `connected` is in the deps, not just the guard: the client instance is now
     stable across the connect, so nothing else would re-run this once
     `userID` finally exists. */
  React.useEffect(() => {
    if (!connected || !client?.userID) return;
    let mounted = true;

    const apply = (
      update: (prev: Record<string, number>) => Record<string, number>
    ) => {
      if (mounted) setUnreadById(update);
    };

    client
      .getUnreadCount()
      .then(({ channels }) => {
        const seed: Record<string, number> = {};
        for (const { channel_id, unread_count } of channels) {
          seed[bareChannelId(channel_id)] = unread_count;
        }
        /* Merged under what's already there, not assigned over it: the socket
           can deliver a message while this request is in flight, and the
           response is a snapshot from before that message existed. Assigning
           would roll the badge back to zero until the next event. */
        apply((prev) => ({ ...seed, ...prev }));
      })
      .catch(() => {
        /* An unread badge is not worth surfacing an error for; the thread
           itself reports failures when it is opened. */
      });

    /* A message the user sent themselves is already read by definition —
       without this the sender's own badge ticks up on every send. */
    const onNew = (event: { channel_id?: string; user?: { id?: string } }) => {
      const id = event.channel_id;
      if (!id || event.user?.id === client.userID) return;
      apply((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    };

    /* `message.read` announces *whoever* read the channel — in a two-person
       thread that is usually the other side, whose read says nothing about
       ours. Only our own read clears our count.

       A `notification.mark_read` with no channel_id is the mark-*everything*-
       read shape; treating it as "clear this one channel" would drop it on
       the floor and leave every badge stale, so it clears the whole map. */
    const onRead = (event: { channel_id?: string; user?: { id?: string } }) => {
      if (event.user?.id !== client.userID) return;
      const id = event.channel_id;
      if (!id) return apply((prev) => (Object.keys(prev).length ? {} : prev));
      apply((prev) => (prev[id] ? { ...prev, [id]: 0 } : prev));
    };

    const subscriptions = [
      client.on("message.new", onNew),
      client.on("notification.message_new", onNew),
      client.on("message.read", onRead),
      client.on("notification.mark_read", onRead),
    ];

    return () => {
      mounted = false;
      subscriptions.forEach((s) => s.unsubscribe());
    };
  }, [client, connected]);

  /* Tour threads are additionally keyed by tour id for the per-card badges;
     listing threads only contribute to the total. */
  return React.useMemo(() => {
    const unreadByTour: Record<string, number> = {};
    let totalUnread = 0;
    for (const [id, unread] of Object.entries(unreadById)) {
      totalUnread += unread;
      if (id.startsWith(TOUR_PREFIX)) {
        unreadByTour[id.slice(TOUR_PREFIX.length)] = unread;
      }
    }
    return { unreadByTour, totalUnread };
  }, [unreadById]);
}

/* Convenience for the tour card badge — reads the count for one tour. */
export function useTourUnread(tourId: string): number {
  const { unreadByTour } = useMessaging();
  return unreadByTour[tourId] ?? 0;
}
