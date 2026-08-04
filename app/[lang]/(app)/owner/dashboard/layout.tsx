import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { DashboardHeader } from "./components/dashboard-header";
import { DashboardStats } from "./components/dashboard-stats";
import { DashboardNav } from "./components/dashboard-nav";
import { dashboardCounts } from "./lib/counts";
import { getMyProfile } from "@/lib/services/profiles";
import { privateMetadata } from "@/lib/seo";

/* ============================================================
   The dashboard chrome: a static shell with three streamed holes.

   Everything the chrome reads is cookie-bound (the owner's name,
   their listings, their tours), so under cacheComponents none of
   it may render outside a <Suspense>. The layout frame itself —
   container, sidebar, headings, nav labels — reads nothing and
   stays prerendered per locale, which is what keeps this route a
   partial prerender rather than a fully dynamic one.

   Each fallback is the same component with its data set to null,
   not a bare skeleton block. The tabs are usable and the stat
   tiles hold their positions from the first paint; only the
   numbers and the greeting arrive with the stream.
   ============================================================ */

// Covers every dashboard tab; none of them are public.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return privateMetadata(lang, "dashboard");
}

export default async function OwnerDashboardLayout({
  children,
  params,
}: LayoutProps<"/[lang]/owner/dashboard">) {
  const { lang } = await params;
  // Opt the shell into static rendering: without this next-intl resolves the
  // locale dynamically, and the chrome outside the boundaries below can no
  // longer prerender. Same reasoning as the /edit routes' generateStaticParams.
  setRequestLocale(lang);

  return (
    <div className="container mx-auto px-5 sm:px-8 py-8">
      <Suspense fallback={<DashboardHeader name={null} />}>
        <HeaderSlot />
      </Suspense>
      <Suspense fallback={<DashboardStats counts={null} />}>
        <StatsSlot />
      </Suspense>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 bg-sidebar p-3">
            <Suspense fallback={<DashboardNav variant="sidebar" counts={null} />}>
              <NavSlot variant="sidebar" />
            </Suspense>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="lg:hidden mb-5">
            <Suspense fallback={<DashboardNav variant="chips" counts={null} />}>
              <NavSlot variant="chips" />
            </Suspense>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

async function HeaderSlot() {
  const { name } = await getMyProfile();
  return <DashboardHeader name={name} />;
}

async function StatsSlot() {
  return <DashboardStats counts={await dashboardCounts()} />;
}

/* Rendered twice — the sidebar and the mobile chips — which costs nothing:
   dashboardCounts() reads request-memoized services, so the second call is
   the first call's result. */
async function NavSlot({ variant }: { variant: "sidebar" | "chips" }) {
  return <DashboardNav variant={variant} counts={await dashboardCounts()} />;
}
