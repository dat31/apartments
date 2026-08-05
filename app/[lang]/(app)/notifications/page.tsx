import { getTranslations, setRequestLocale } from "next-intl/server";
import { NotificationList } from "@/components/notifications/notification-list";
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

   The feed itself is a client island. It shares one component and one
   react-query cache entry with the popover, so opening this page after
   reading something in the bell shows the same state rather than re-fetching
   into a different one. */
export default async function NotificationsPage({
  params,
}: PageProps<"/[lang]/notifications">) {
  const { lang } = await params;
  setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: "notifications" });

  return (
    <div className="container mx-auto px-5 sm:px-8 py-8">
      <div className="max-w-2xl">
        {/* The heading block every (app) page shares — same type scale, same
            mb-8, same flex row so a right-hand action can be dropped in later
            without moving the title. Browse, Saved, Tours and Messages all
            render this exact shape. */}
        <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        <div className="bg-card">
          <NotificationList />
        </div>
      </div>
    </div>
  );
}
