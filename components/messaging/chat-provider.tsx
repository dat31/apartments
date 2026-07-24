"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { Chat, WithComponents, useCreateChatClient } from "stream-chat-react";
import type { Event, StreamChat } from "stream-chat";
import { useUser } from "@/hooks/auth";
import { type Locale } from "@/i18n/routing";
import { CHANNEL_TYPE, tourChannelId } from "@/lib/stream/channel";
import { streamI18n } from "@/lib/stream/i18n";
import { messagingComponents } from "./stream-components";
import "@/lib/stream/custom-data";
import "./stream-theme.css";

/* ============================================================
   One Stream connection per page tree.

   Mounted only by pages that show conversations (/messages, /tour, the owner
   dashboard) — browsing the rest of the app costs no websocket.

   Two structural rules, each one a fixed bug:

   1. `children` sit at the same position in the tree on every render. React
      reconciles by position and type, so wrapping them in <Chat> *later* —
      once the token lands, once the socket connects — reads as a different
      element at that slot and unmounts everything below: channel watches
      re-run and threads that had already painted drop back to a skeleton.
      Readiness is therefore a context value, and <Chat> is mounted by the
      chat surfaces themselves (<MessagingChat>), not around the page.

   2. Client creation is useCreateChatClient and nothing else. It owns
      instantiation, connectUser, strict-mode double-mount protection and
      disconnect — no module-level client, no manual connect/disconnect, no
      ref-counted acquire/release layer.
   ============================================================ */

type Credentials = {
  chatToken: string;
  apiKey: string;
  userId: string;
  name: string;
};

type MessagingState = {
  /** The connected client, or null while the socket is coming up. */
  client: StreamChat | null;
  /** False while the token is in flight or the socket is connecting — chat
      surfaces show an inline skeleton rather than an error in that window. */
  ready: boolean;
  /** Terminal: the token request gave up. Distinct from `!ready`, so
      consumers can show an error instead of a skeleton forever. */
  failed: boolean;
  /** Unread messages per tour id, for the badges on tour cards. */
  unreadByTour: Record<string, number>;
  /** Every unread message across all conversations. Feeds the inbox title —
      not a global header badge, which would need a socket on every page. */
  totalUnread: number;
};

const IDLE: MessagingState = {
  client: null,
  ready: false,
  failed: false,
  unreadByTour: {},
  totalUnread: 0,
};

const MessagingContext = React.createContext<MessagingState>(IDLE);

export const useMessaging = () => React.useContext(MessagingContext);

async function fetchCredentials(): Promise<Credentials> {
  const response = await fetch("/api/stream/token", { cache: "no-store" });
  if (!response.ok) throw new Error(`stream token request failed: ${response.status}`);
  return response.json();
}

export function MessagingProvider({
  children,
  /* Lets a page skip the connection entirely when it has nothing to show
     (a renter with no tours yet) — no token request, no websocket. */
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const { data: user } = useUser();
  const [client, setClient] = React.useState<StreamChat | null>(null);

  /* Keyed on the user id so a sign-out or account switch can never reuse the
     previous person's credentials. The token inside expires
     (STREAM_TOKEN_TTL_SECONDS); refreshing it is the token provider's job, so
     this cache time only governs the apiKey / userId / name alongside it. */
  const { data: credentials, isError } = useQuery({
    queryKey: ["stream", "credentials", user?.id],
    enabled: enabled && !!user?.id,
    staleTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: fetchCredentials,
  });

  const { unreadByTour, totalUnread } = useUnread(client);

  const value = React.useMemo(
    () => ({
      client,
      ready: !!client,
      failed: isError,
      unreadByTour,
      totalUnread,
    }),
    [client, isError, unreadByTour, totalUnread]
  );

  return (
    <MessagingContext.Provider value={value}>
      {/* useCreateChatClient connects unconditionally, so it can only be
          called once real credentials exist. Hosting it in a null-rendering
          sibling keeps that conditional legal without ever moving `children`
          (see rule 1 above). */}
      {credentials ? (
        <ChatClientHost credentials={credentials} onClient={setClient} />
      ) : null}
      {children}
    </MessagingContext.Provider>
  );
}

function ChatClientHost({
  credentials,
  onClient,
}: {
  credentials: Credentials;
  onClient: (client: StreamChat | null) => void;
}) {
  const userData = React.useMemo(
    () => ({ id: credentials.userId, name: credentials.name }),
    [credentials.userId, credentials.name]
  );

  /* A provider rather than the token string: tokens expire, and a fixed
     string leaves the SDK unable to reconnect once it lapses. Identity comes
     from the session cookie on every call, so this can only ever mint a token
     for the signed-in user.

     The first call spends the token the query above already fetched — going
     back to the network for it would re-run the auth check, the profile read
     and the user upsert for nothing. Every later call is a real refresh. */
  const unspentToken = React.useRef<string | null>(credentials.chatToken);
  const tokenProvider = React.useCallback(async () => {
    const cached = unspentToken.current;
    if (cached) {
      unspentToken.current = null;
      return cached;
    }
    return (await fetchCredentials()).chatToken;
  }, []);

  const client = useCreateChatClient({
    apiKey: credentials.apiKey,
    tokenOrProvider: tokenProvider,
    userData,
  });

  React.useEffect(() => {
    onClient(client);
    return () => onClient(null);
  }, [client, onClient]);

  return null;
}

/* Mounts <Chat> around one chat surface, once the socket is up. Surfaces —
   the inbox, an expanded tour panel — render their own inline skeleton
   through `fallback` while the client is still connecting. */
export function MessagingChat({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { client } = useMessaging();
  const { resolvedTheme } = useTheme();
  const locale = useLocale() as Locale;

  if (!client) return <>{fallback}</>;

  return (
    <Chat
      client={client}
      theme={
        resolvedTheme === "dark" ? "str-chat__theme-dark" : "str-chat__theme-light"
      }
      i18nInstance={streamI18n(locale)}
    >
      <WithComponents overrides={messagingComponents}>{children}</WithComponents>
    </Chat>
  );
}

/* ---------------- unread counts ----------------

   Seeded from client.getUnreadCount(): one request covering every channel the
   user is a member of, with no watches. Seeding from queryChannels instead
   would cap the badges at the page size and open a watch per channel just to
   read a number.

   Kept live from event deltas. notification.message_new fires for member
   channels the user is *not* watching — which is exactly a collapsed tour
   panel — while message.new covers the watched ones. */

/** Recover a tour id from a channel cid, e.g. "messaging:tour-<uuid>". Listing
    threads hash their id and map to no tour; they only feed the total. */
function tourIdFromCid(cid: string | undefined): string | null {
  if (!cid) return null;
  const withoutType = cid.startsWith(`${CHANNEL_TYPE}:`)
    ? cid.slice(CHANNEL_TYPE.length + 1)
    : cid;
  const prefix = tourChannelId("");
  return withoutType.startsWith(prefix) ? withoutType.slice(prefix.length) : null;
}

type UnreadState = { unreadByTour: Record<string, number>; totalUnread: number };

const EMPTY_UNREAD: UnreadState = { unreadByTour: {}, totalUnread: 0 };

function useUnread(client: StreamChat | null): UnreadState {
  const [state, setState] = React.useState<UnreadState>(EMPTY_UNREAD);
  const [attachedTo, setAttachedTo] = React.useState<StreamChat | null>(null);

  // Reset during render, not from an effect: a sign-out or account switch
  // must not leave the previous person's badges on screen for a frame.
  if (attachedTo !== client) {
    setAttachedTo(client);
    setState(EMPTY_UNREAD);
  }

  React.useEffect(() => {
    if (!client) return;

    let active = true;

    client
      .getUnreadCount()
      .then((counts) => {
        if (!active) return;
        const unreadByTour: Record<string, number> = {};
        counts.channels.forEach(({ channel_id: cid, unread_count: unread }) => {
          const tourId = tourIdFromCid(cid);
          if (tourId && unread > 0) unreadByTour[tourId] = unread;
        });
        setState({ unreadByTour, totalUnread: counts.total_unread_count });
      })
      .catch(() => {
        // A failed seed leaves the badges at zero; the event deltas below
        // still keep new arrivals visible.
      });

    const bump = (event: Event) => {
      // Own sends are never unread. `message.new` fires for the sender too.
      if (event.user?.id === client.userID) return;
      const tourId = tourIdFromCid(event.cid);
      setState((previous) => ({
        totalUnread: event.total_unread_count ?? previous.totalUnread + 1,
        unreadByTour: tourId
          ? { ...previous.unreadByTour, [tourId]: (previous.unreadByTour[tourId] ?? 0) + 1 }
          : previous.unreadByTour,
      }));
    };

    const clear = (event: Event) => {
      const tourId = tourIdFromCid(event.cid);
      setState((previous) => {
        const unreadByTour = { ...previous.unreadByTour };
        if (tourId) delete unreadByTour[tourId];
        return {
          totalUnread: event.total_unread_count ?? 0,
          unreadByTour,
        };
      });
    };

    const subscriptions = [
      client.on("notification.message_new", bump),
      client.on("message.new", bump),
      client.on("notification.mark_read", clear),
    ];

    return () => {
      active = false;
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  }, [client]);

  return state;
}
