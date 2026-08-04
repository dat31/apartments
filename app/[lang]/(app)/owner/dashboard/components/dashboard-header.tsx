import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

/* Who the owner is now comes from the server — getMyProfile(), in the
   layout's Suspense slot — so the greeting ships inside the HTML.

   This used to be a client component gated on useHydrated(): the prerender
   baked in "Welcome back, Host", hydration swapped in the real name, and the
   gate existed to hide that mismatch behind a skeleton. Resolving the name on
   the server removes the mismatch rather than covering it. With the "New
   listing" button as a Link rather than a router.push, nothing left here
   needs the client.

   `name={null}` is the streaming fallback the layout renders. An empty string
   is different: a signed-in owner who genuinely hasn't given a name, greeted
   by `hostFallback`. */
export function DashboardHeader({ name }: { name: string | null }) {
  const t = useTranslations("dashboard");
  const firstName = (name?.trim() || t("hostFallback")).split(/\s+/)[0];

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
          {t("eyebrow")}
        </p>
        {/* h-9 matches the text-3xl line box, so the greeting lands without
            moving the stats below it. */}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {name === null ? (
            <Skeleton className="skeleton h-9 w-72 max-w-full" />
          ) : (
            t("welcome", { name: firstName })
          )}
        </h1>
      </div>
      <Button asChild>
        <Link href="/apartments/create">
          <Plus size={18} /> {t("newListing")}
        </Link>
      </Button>
    </div>
  );
}
