import { Inbox } from "@/components/messaging/inbox";
import { privateMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/messages">) {
  const { lang } = await params;
  return privateMetadata(lang, "messages");
}

/* The inbox. A thin server shell around a client island — conversations live
   in Stream, not in our database, so there is nothing to fetch server-side.

   `?c=<channelId>` deep-links a specific thread; the listing detail page's
   "Message owner" button provisions the channel and then lands here. */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  return <Inbox initialChannelId={c} />;
}
