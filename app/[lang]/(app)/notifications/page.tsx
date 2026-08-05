import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NotificationFeed } from "./components/notification-feed";
import { SkeletonNotifications } from "@/components/notifications/skeleton-notification";
import { privateMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/notifications">) {
  const { lang } = await params;
  return privateMetadata(lang, "notifications");
}

/* The full notification history — what the bell popover's "See all" opens.

   setRequestLocale is called here rather than left to the layout: a page whose
   subtree translates on the server has to pin its own locale, or next-intl
   resolves it from the request and the read is attributed to the enclosing
   render instead of to a boundary (AGENTS.md, "Every page pins its own
   locale"). The frame below reads nothing else, so it prerenders per locale.

   The feed itself is a client island — per-user, mutable, and filtered from
   the URL, so there is nothing here for the server to cache. It shares one
   react-query cache entry with the popover, so opening this page after reading
   something in the bell shows the same state rather than re-fetching into a
   different one. The <Suspense> is what lets it read `?show=` without making
   this route dynamic: the shell is still prerendered, the filter is resolved
   on the client. */
export default async function NotificationsPage({
  params,
}: PageProps<"/[lang]/notifications">) {
  const { lang } = await params;
  setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: "notifications" });

  return (
    <div className="container mx-auto px-5 py-8 sm:px-8">
      <div className="max-w-3xl">
        {/* The heading block every (app) page shares — same type scale, same
            flex row so a right-hand action can be dropped in later without
            moving the title. Browse, Saved, Tours and Messages all render this
            exact shape. */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="bg-card">
              <SkeletonNotifications count={5} />
            </div>
          }
        >
          <NotificationFeed />
        </Suspense>
      </div>
    </div>
  );
}
