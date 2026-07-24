import { privateMetadata } from "@/lib/seo";
import { MessagingProvider } from "@/components/messaging/chat-provider";
import { Inbox } from "@/components/messaging/inbox";

export async function generateMetadata({ params }: PageProps<"/[lang]/messages">) {
  const { lang } = await params;
  return privateMetadata(lang, "messages");
}

/* The inbox is the page: conversations are websocket-driven, so there is
   nothing here to server-render around them. `?channel=<id>` deep-links a
   thread — read on the server so no client Suspense boundary is needed for
   useSearchParams. */
export default async function MessagesPage({
  searchParams,
}: PageProps<"/[lang]/messages">) {
  const { channel } = await searchParams;

  return (
    <MessagingProvider>
      <Inbox initialChannelId={typeof channel === "string" ? channel : undefined} />
    </MessagingProvider>
  );
}
