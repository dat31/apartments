import { setRequestLocale } from "next-intl/server";
import { privateMetadata } from "@/lib/seo";
import { MessagingProvider } from "@/components/messaging/chat-provider";
import { Inbox } from "@/components/messaging/inbox";

export async function generateMetadata({ params }: PageProps<"/[lang]/messages">) {
  const { lang } = await params;
  return privateMetadata(lang, "messages");
}

/* The inbox is the page: conversations are websocket-driven, so there is
   nothing here to server-render around them.

   `?channel=<id>` deep-links a thread, and it is read on the *client*, inside
   the boundary in <Inbox> — not here. Awaiting searchParams in this component
   would be a request-time read above every boundary, which drops the whole
   route out of the static shell: /messages then prerendered nothing but the
   (app) group's full-screen spinner, and a navigation here had to wait on the
   server before painting anything at all. Same reasoning, and the same fix, as
   the `?show=` filter on /notifications. */
export default async function MessagesPage({
  params,
}: PageProps<"/[lang]/messages">) {
  const { lang } = await params;
  // Pin the locale so the shell prerenders per language rather than resolving
  // the request locale dynamically (AGENTS.md, "Every page pins its own locale").
  setRequestLocale(lang);

  return (
    <MessagingProvider>
      <Inbox />
    </MessagingProvider>
  );
}
